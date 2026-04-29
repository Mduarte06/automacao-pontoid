// ==UserScript==
// @name         Ponto ID - Automação Nível Engenharia (V26 - Painel de Controle)
// @namespace    http://tampermonkey.net/
// @version      26.0
// @description  Adiciona interface para configurar os dias e a quantidade de aulas sem mexer no código.
// @match        *://teotoniovilela.pontoid.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ==========================================
    // MOTOR DE GRADE DINÂMICA
    // ==========================================
    const disciplinasPadrao = ["LÍNGUA PORTUGUESA", "HISTÓRIA", "MATEMÁTICA", "GEOGRAFIA", "CIÊNCIAS", "EDUCAÇÃO FÍSICA", "ARTE", "ENSINO RELIGIOSO"];
    
    function getGrade() {
        let saved = localStorage.getItem('grade_pontoid_custom');
        if (saved) return JSON.parse(saved);
        
        // Grade padrão inicial (A sua matriz atual para ele funcionar de cara)
        return {
            "LÍNGUA PORTUGUESA": [{ diaSemana: 1, aulasPorDia: 2 }, { diaSemana: 2, aulasPorDia: 2 }, { diaSemana: 5, aulasPorDia: 2 }],
            "HISTÓRIA": [{ diaSemana: 1, aulasPorDia: 2 }],
            "MATEMÁTICA": [{ diaSemana: 2, aulasPorDia: 1 }, { diaSemana: 3, aulasPorDia: 2 }, { diaSemana: 4, aulasPorDia: 2 }],
            "GEOGRAFIA": [{ diaSemana: 3, aulasPorDia: 2 }],
            "CIÊNCIAS": [{ diaSemana: 4, aulasPorDia: 2 }],
            "EDUCAÇÃO FÍSICA": [{ diaSemana: 5, aulasPorDia: 2 }],
            "ARTE": [{ diaSemana: 2, aulasPorDia: 1 }],
            "ENSINO RELIGIOSO": [{ diaSemana: 1, aulasPorDia: 1 }]
        };
    }

    const parseData = (str) => { const [d, m, y] = str.split('/').map(Number); return new Date(y, m - 1, d); };
    const formatData = (date) => { return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`; };

    function gerarCalendarioDisciplina(disciplina, dataInicioStr, dataFimStr) {
        let configLista = getGrade()[disciplina];
        if (!configLista) return [];

        let dataAtual = parseData(dataInicioStr);
        let dataFimObj = parseData(dataFimStr);
        let calendario = [];

        while (dataAtual <= dataFimObj) {
            let diaSemanaAtual = dataAtual.getDay();
            let configDia = configLista.find(c => c.diaSemana === diaSemanaAtual);
            if (configDia && configDia.aulasPorDia > 0) {
                calendario.push({ dataVigente: formatData(dataAtual), repeticoes: configDia.aulasPorDia });
            }
            dataAtual.setDate(dataAtual.getDate() + 1); 
        }
        return calendario;
    }

    async function selecionarDisciplinaComRadar(nomeDisciplina) {
        let selectOriginal = null;
        document.querySelectorAll('label').forEach(label => {
            if (label.innerText.includes("Componente Curricular") && !label.innerText.includes("Associado")) {
                let divPai = label.parentElement; if (divPai) selectOriginal = divPai.querySelector('select');
            }
        });
        if (!selectOriginal) return false;
        let valorOpcao = null;
        for (let t = 1; t <= 15; t++) { 
            for (let opt of selectOriginal.options) {
                if (opt.text.toUpperCase().includes(nomeDisciplina.toUpperCase())) { valorOpcao = opt.value; break; }
            }
            if (valorOpcao) break; await sleep(500); 
        }
        if (!valorOpcao) return false;
        if (typeof jQuery !== 'undefined') { jQuery(selectOriginal).val(valorOpcao).trigger('change'); } 
        else { selectOriginal.value = valorOpcao; selectOriginal.dispatchEvent(new Event('change', { bubbles: true })); }
        await sleep(1000); return true; 
    }

    function mostrarToast(mensagem, cor = "#28a745") {
        let toast = document.createElement("div"); toast.innerText = mensagem;
        toast.style = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: ${cor}; color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; z-index: 10000; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: opacity 0.5s;`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 500); }, 3000);
    }

    // ==========================================
    // UI DO PAINEL DE CONFIGURAÇÕES
    // ==========================================
    window.salvarGradePeloModal = function() {
        let novaGrade = {};
        disciplinasPadrao.forEach(disc => {
            novaGrade[disc] = [];
            // Dias: 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
            for(let d=1; d<=5; d++) {
                let input = document.getElementById(`cfg_${disc.replace(/\s/g, '')}_${d}`);
                let qtd = parseInt(input.value) || 0;
                if(qtd > 0) novaGrade[disc].push({ diaSemana: d, aulasPorDia: qtd });
            }
        });
        localStorage.setItem('grade_pontoid_custom', JSON.stringify(novaGrade));
        document.getElementById('backdrop-config-pontoid').style.display='none';
        mostrarToast("⚙️ Grade atualizada com sucesso!");
    };

    function abrirConfiguracoes() {
        let modal = document.getElementById('modal-config-pontoid');
        let backdrop = document.getElementById('backdrop-config-pontoid');

        if (!backdrop) {
            backdrop = document.createElement('div'); backdrop.id = 'backdrop-config-pontoid';
            backdrop.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: none; justify-content: center; align-items: center;";
            modal = document.createElement('div'); modal.id = 'modal-config-pontoid';
            modal.style = "background: white; width: 85%; max-width: 800px; max-height: 85vh; border-radius: 12px; padding: 25px; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5); font-family: sans-serif;";
            backdrop.appendChild(modal); document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.style.display = 'none'; });
        }

        let gradeAtual = getGrade();
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">⚙️ Configurar Grade Curricular</h2>
                <button onclick="document.getElementById('backdrop-config-pontoid').style.display='none'" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 5px 15px; cursor: pointer; font-weight: bold;">Fechar (X)</button>
            </div>
            <p style="color: #6c757d; font-size: 14px; margin-bottom: 20px;">Digite a quantidade de aulas que você dá de cada matéria em cada dia da semana. Deixe 0 se não houver aula.</p>
            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px;">
                <thead>
                    <tr style="background: #007bff; color: white;">
                        <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 0;">Matéria</th>
                        <th style="padding: 10px;">Segunda</th><th style="padding: 10px;">Terça</th>
                        <th style="padding: 10px;">Quarta</th><th style="padding: 10px;">Quinta</th>
                        <th style="padding: 10px; border-radius: 0 6px 0 0;">Sexta</th>
                    </tr>
                </thead>
                <tbody>
        `;

        disciplinasPadrao.forEach(disc => {
            let configDisc = gradeAtual[disc] || [];
            html += `<tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 12px; text-align: left; font-weight: bold; color: #495057;">${disc}</td>`;
            for(let d=1; d<=5; d++) {
                let match = configDisc.find(c => c.diaSemana === d);
                let valor = match ? match.aulasPorDia : 0;
                let id = `cfg_${disc.replace(/\s/g, '')}_${d}`;
                html += `<td><input type="number" id="${id}" min="0" max="6" value="${valor}" style="width: 50px; padding: 5px; text-align: center; border: 1px solid #ced4da; border-radius: 4px;"></td>`;
            }
            html += `</tr>`;
        });

        html += `</tbody></table>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="window.salvarGradePeloModal()" style="background: #28a745; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px;">💾 Salvar Nova Grade</button>
            </div>`;
        
        modal.innerHTML = html; backdrop.style.display = 'flex';
    }

    // ==========================================
    // UI DA MOCHILA (MANTIDO DA V25)
    // ==========================================
    window.removerItemMochila = function(index) {
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        fila.splice(index, 1); localStorage.setItem('fila_ponto_id', JSON.stringify(fila));
        mostrarToast("🗑️ Item removido da mochila!", "#dc3545"); abrirMochila(); atualizarInterface();
    };

    function abrirMochila() {
        // [O código da mochila permanece idêntico ao da Versão 25, gerando a tabela]
        let modal = document.getElementById('modal-mochila-pontoid'); let backdrop = document.getElementById('backdrop-mochila-pontoid');
        if (!backdrop) {
            backdrop = document.createElement('div'); backdrop.id = 'backdrop-mochila-pontoid';
            backdrop.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: none; justify-content: center; align-items: center;";
            modal = document.createElement('div'); modal.id = 'modal-mochila-pontoid';
            modal.style = "background: white; width: 85%; max-width: 900px; max-height: 80vh; border-radius: 12px; padding: 25px; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5);";
            backdrop.appendChild(modal); document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.style.display = 'none'; });
        }
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        let html = `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">🎒 Sua Mochila <span style="background: #007bff; color: white; padding: 2px 10px; border-radius: 20px; font-size: 14px;">${fila.length} itens</span></h2>
                <button onclick="document.getElementById('backdrop-mochila-pontoid').style.display='none'" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 5px; padding: 5px 15px; cursor: pointer;">Fechar (X)</button></div>`;
        if (fila.length === 0) { html += `<div style="text-align: center; padding: 40px; color: #7f8c8d;">A mochila está vazia.</div>`;
        } else {
            html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                <thead><tr style="background: #f1f3f5;"><th style="padding: 12px;">Data Destino</th><th style="padding: 12px;">Matéria</th><th style="padding: 12px;">Resumo</th><th style="padding: 12px; text-align: center;">Ações</th></tr></thead><tbody>`;
            fila.forEach((aula, index) => {
                let resumo = aula.conteudo.length > 50 ? aula.conteudo.substring(0, 50) + "..." : aula.conteudo;
                html += `<tr style="border-bottom: 1px solid #e9ecef;">
                        <td style="padding: 12px; font-weight: bold;">📅 ${aula.data}</td>
                        <td style="padding: 12px; color: #0056b3; font-weight: bold;">${aula.disciplina} <span style="font-size: 11px; background: #e9ecef; padding: 3px 6px; border-radius: 4px;">${aula.repeticoes}x</span></td>
                        <td style="padding: 12px; color: #6c757d; font-style: italic;">"${resumo}"</td>
                        <td style="padding: 12px; text-align: center;"><button onclick="window.removerItemMochila(${index})" style="background: #ff4757; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">🗑️ Apagar</button></td></tr>`;
            });
            html += `</tbody></table>`;
        }
        modal.innerHTML = html; backdrop.style.display = 'flex';
    }

    // ==========================================
    // CAPTURADOR
    // ==========================================
    document.addEventListener('keydown', function(e) {
        let gradeDin = getGrade(); // Puxa a grade atualizada do painel
        
        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault(); 
            let textoSelecionado = window.getSelection().toString();
            if (textoSelecionado.length > 15) {
                let textoUpper = textoSelecionado.toUpperCase();
                let disc = null;
                let minIndex = Infinity;
                for (let d in gradeDin) { 
                    let pos = textoUpper.indexOf(d);
                    if (pos !== -1 && pos < minIndex) { minIndex = pos; disc = d; }
                }
                if (!disc) return mostrarToast("⚠️ Selecione o cabeçalho com a matéria!", "#dc3545");

                let configLote = JSON.parse(localStorage.getItem('config_lote_pontoid'));
                if (!configLote) {
                    let dIni = prompt("📅 Data de INÍCIO (DD/MM/AAAA):", "01/05/2026");
                    let dFim = prompt("📅 Data de FIM (DD/MM/AAAA):", "31/05/2026");
                    if (!dIni || !dFim) return;
                    configLote = { inicio: dIni, fim: dFim }; localStorage.setItem('config_lote_pontoid', JSON.stringify(configLote));
                }

                let calendario = gerarCalendarioDisciplina(disc, configLote.inicio, configLote.fim);
                let contadores = JSON.parse(localStorage.getItem('contadores_pontoid') || '{}');
                let idx = contadores[disc] || 0;
                
                if (idx >= calendario.length) return mostrarToast(`🚫 FIM DO LOTE para ${disc}.`, "#dc3545");

                let configAula = calendario[idx]; 
                let partesM = textoSelecionado.split(/Metodologia:/i);
                let partesC = partesM[0].split(/Objeto de Conhecimento\/Habilidade:?/i);
                let cont = partesC.length > 1 ? partesC[1].trim() : partesM[0].trim();
                let meto = partesM[1] ? partesM[1].trim() : "";

                let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
                fila.push({ data: configAula.dataVigente, conteudo: cont, metodologia: meto, disciplina: disc, repeticoes: configAula.repeticoes });
                localStorage.setItem('fila_ponto_id', JSON.stringify(fila));
                
                contadores[disc] = idx + 1; localStorage.setItem('contadores_pontoid', JSON.stringify(contadores));
                atualizarInterface(); mostrarToast(`✅ [${disc}] salva para o dia ${configAula.dataVigente}! (${configAula.repeticoes}x)`);
            }
        }

        if (e.altKey && e.code === 'KeyP') {
            e.preventDefault();
            let textoSelecionado = window.getSelection().toString().toUpperCase();
            let disc = null; let minIndex = Infinity;
            for (let d in gradeDin) { 
                let pos = textoSelecionado.indexOf(d);
                if (pos !== -1 && pos < minIndex) { minIndex = pos; disc = d; }
            }
            if (!disc) return alert("⚠️ Selecione a MATÉRIA que quer pular!");

            let configLote = JSON.parse(localStorage.getItem('config_lote_pontoid'));
            if (!configLote) return alert("Comece a copiar uma aula primeiro.");

            let calendario = gerarCalendarioDisciplina(disc, configLote.inicio, configLote.fim);
            let contadores = JSON.parse(localStorage.getItem('contadores_pontoid') || '{}');
            let idx = contadores[disc] || 0;
            
            if (idx >= calendario.length) return mostrarToast(`🚫 Não há mais dias!`, "#dc3545");

            let diaPulado = calendario[idx].dataVigente;
            contadores[disc] = idx + 1; localStorage.setItem('contadores_pontoid', JSON.stringify(contadores));
            mostrarToast(`⏩ Pulou o dia ${diaPulado} de ${disc}.`, "#ffc107");
        }
    });

    // ==========================================
    // MOTOR DE INJEÇÃO PRINCIPAL (MANTIDO V25)
    // ==========================================
    async function executarRobo() {
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        if (fila.length === 0) return alert("Fila vazia!");
        if (!confirm(`🚀 Iniciar preenchimento?\nPeríodo: ${JSON.parse(localStorage.getItem('config_lote_pontoid')).inicio} até ${JSON.parse(localStorage.getItem('config_lote_pontoid')).fim}`)) return;

        for (let aula of fila) {
            for (let j = 0; j < aula.repeticoes; j++) {
                let dataVigente = aula.data; 
                let dataAceita = false;
                while (!dataAceita) {
                    document.querySelector('button[onclick*="redirecionarParaTelaDeAdicaoDeConteudo"]').click();
                    await sleep(2500); 
                    let campoData = document.querySelector('#DataAula');
                    campoData.value = dataVigente;
                    campoData.dispatchEvent(new Event('input', { bubbles: true }));
                    campoData.dispatchEvent(new Event('change', { bubbles: true }));
                    await sleep(2000); 
                    if (document.body.innerText.includes("não é um dia letivo")) {
                        document.querySelectorAll('button').forEach(b => { if(b.innerText.trim().toUpperCase() === 'OK') b.click(); });
                        await sleep(1000);
                        document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('Fechar')) b.click(); });
                        await sleep(1500);
                        let dObj = parseData(dataVigente); dObj.setDate(dObj.getDate() + 7); dataVigente = formatData(dObj);
                    } else { dataAceita = true; }
                }
                
                await selecionarDisciplinaComRadar(aula.disciplina);
                let caixas = document.querySelectorAll('textarea[id^="ItemDoAgrupador_"]');
                if (caixas.length >= 2) {
                    caixas[0].value = aula.conteudo; caixas[1].value = aula.metodologia;
                    caixas[0].dispatchEvent(new Event('input', { bubbles: true })); caixas[1].dispatchEvent(new Event('input', { bubbles: true }));
                }
                await sleep(500); document.querySelector('button[onclick*="onClickSalvarConteudo"]').click(); await sleep(4000); 
            }
        }
        alert("🎉 Turma concluída com sucesso!");
    }

    // ==========================================
    // RENDERIZAÇÃO DOS BOTÕES
    // ==========================================
    let container = document.createElement("div");
    container.style = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
    
    // NOVO: BOTÃO DE CONFIGURAÇÕES
    let btnConfig = document.createElement("button");
    btnConfig.innerHTML = "⚙️ Configurar Grade";
    btnConfig.style = "padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
    btnConfig.onclick = abrirConfiguracoes;

    let btnMochila = document.createElement("button");
    btnMochila.innerHTML = "🎒 Ver Mochila";
    btnMochila.style = "padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
    btnMochila.onclick = abrirMochila;

    let btnRodar = document.createElement("button");
    btnRodar.style = "padding: 15px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
    btnRodar.onclick = executarRobo;
    
    let btnLimpar = document.createElement("button");
    btnLimpar.innerHTML = "🗑️ Limpar Tudo / Resetar";
    btnLimpar.style = "padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 11px; opacity: 0.8;";
    btnLimpar.onclick = () => {
        if(confirm("ATENÇÃO: Deseja apagar todas as aulas da mochila e resetar as datas de início/fim do mês?")) {
            localStorage.removeItem('fila_ponto_id'); localStorage.removeItem('contadores_pontoid'); localStorage.removeItem('config_lote_pontoid');
            atualizarInterface(); mostrarToast("🗑️ Sistema resetado!", "#dc3545");
        }
    };
    
    container.appendChild(btnConfig); // Adiciona o botão de engrenagem
    container.appendChild(btnMochila); 
    container.appendChild(btnLimpar); 
    container.appendChild(btnRodar); 
    document.body.appendChild(container);

    function atualizarInterface() {
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        let config = JSON.parse(localStorage.getItem('config_lote_pontoid'));
        btnRodar.innerHTML = config ? `🚀 Ejetar Lote [${fila.length}]` : "🚀 Rodar Automação";
        btnRodar.style.display = fila.length === 0 ? "none" : "block";
        btnLimpar.style.display = fila.length === 0 ? "none" : "block";
    }
    atualizarInterface();

})();
