// ==UserScript==
// @name         Ponto ID - Automação Nível Engenharia (V16 - Radar AJAX)
// @namespace    http://tampermonkey.net/
// @version      16.0
// @description  Aguarda o servidor carregar as matérias antes de selecionar.
// @match        *://teotoniovilela.pontoid.com.br/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const grade = {
        "MATEMÁTICA": { diaSemana: 1, aulasPorDia: 3 },
        "ARTE": { diaSemana: 2, aulasPorDia: 1 },
        "CIÊNCIAS": { diaSemana: 2, aulasPorDia: 2 },
        "HISTÓRIA": { diaSemana: 3, aulasPorDia: 1 },
        "GEOGRAFIA": { diaSemana: 3, aulasPorDia: 2 },
        "LÍNGUA PORTUGUESA": { diaSemana: 4, aulasPorDia: 3 },
        "ENSINO RELIGIOSO": { diaSemana: 5, aulasPorDia: 1 },
        "EDUCAÇÃO FÍSICA": { diaSemana: 5, aulasPorDia: 2 }
    };

    function calcularDataAula(disciplina, indiceSemana, mes, ano) {
        let config = grade[disciplina];
        if (!config) return null;
        let data = new Date(ano, mes - 1, 1);
        while (data.getDay() !== config.diaSemana) { data.setDate(data.getDate() + 1); }
        data.setDate(data.getDate() + (indiceSemana * 7));
        return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${ano}`;
    }

    // ==========================================
    // SELETOR COM RADAR DE CARREGAMENTO (V16)
    // ==========================================
    async function selecionarDisciplinaComRadar(nomeDisciplina) {
        console.log(`🤖 Radar ativado: Aguardando o servidor liberar a matéria [${nomeDisciplina}]...`);

        // 1. Acha o verdadeiro <select> que fica escondido atrás do Select2
        let selectOriginal = null;
        document.querySelectorAll('label').forEach(label => {
            if (label.innerText.includes("Componente Curricular") && !label.innerText.includes("Associado")) {
                let divPai = label.parentElement;
                if (divPai) selectOriginal = divPai.querySelector('select');
            }
        });

        if (!selectOriginal) {
            let selects = document.querySelectorAll('select');
            if (selects.length > 0) selectOriginal = selects[0]; // Chute educado
        }

        if (!selectOriginal) return false;

        // 2. O LOOP DO RADAR (Fica checando a cada 500ms até a matéria aparecer na lista)
        let valorOpcao = null;
        for (let tentativa = 1; tentativa <= 15; tentativa++) { // Tenta por até 7.5 segundos

            for (let opt of selectOriginal.options) {
                if (opt.text.toUpperCase().includes(nomeDisciplina.toUpperCase())) {
                    valorOpcao = opt.value; // Achou a matéria que o servidor acabou de carregar!
                    break;
                }
            }

            if (valorOpcao) break; // Se achou, sai do loop de espera.

            console.log(`⏳ Internet pensando... (Tentativa ${tentativa}/15)`);
            await sleep(500); // Pausa e tenta de novo
        }

        if (!valorOpcao) {
            console.error(`❌ O servidor do Ponto ID não retornou a matéria ${nomeDisciplina} para o dia escolhido.`);
            return false;
        }

        // 3. INJEÇÃO CIRÚRGICA (Padrão Ouro para Select2)
        console.log(`✅ Matéria encontrada na lista oculta! Injetando...`);

        // Usa o jQuery (que é nativo do Ponto ID) para forçar o Select2 a aceitar a matéria na marra
        if (typeof jQuery !== 'undefined') {
            jQuery(selectOriginal).val(valorOpcao).trigger('change');
        } else {
            selectOriginal.value = valorOpcao;
            selectOriginal.dispatchEvent(new Event('change', { bubbles: true }));
        }

        await sleep(1000); // Tempo para a interface piscar e atualizar
        return true;
    }

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            let textoSelecionado = window.getSelection().toString();
            if (textoSelecionado.length > 15) {
                let textoUpper = textoSelecionado.toUpperCase();
                let disciplinaDetectada = null;
                for (let d in grade) { if (textoUpper.includes(d)) { disciplinaDetectada = d; break; } }
                if (!disciplinaDetectada) return alert("⚠️ Não identifiquei a disciplina!");

                let partesMetodologia = textoSelecionado.split(/Metodologia:/i);
                let partesConteudo = partesMetodologia[0].split(/Objeto de Conhecimento\/Habilidade:?/i);
                let conteudo = partesConteudo.length > 1 ? partesConteudo[1].trim() : partesMetodologia[0].trim();
                let metodologia = partesMetodologia[1] ? partesMetodologia[1].trim() : "";

                let configData = JSON.parse(localStorage.getItem('config_data_pontoid'));
                if (!configData) {
                    let inputData = prompt("📅 Mês/Ano (MM/AAAA):", "05/2026");
                    if (!inputData) return;
                    let [mes, ano] = inputData.split('/');
                    configData = { mes: parseInt(mes), ano: parseInt(ano) };
                    localStorage.setItem('config_data_pontoid', JSON.stringify(configData));
                }

                let contadores = JSON.parse(localStorage.getItem('contadores_pontoid') || '{}');
                let indiceSemana = contadores[disciplinaDetectada] || 0;
                let dataCalculada = calcularDataAula(disciplinaDetectada, indiceSemana, configData.mes, configData.ano);

                let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
                fila.push({ data: dataCalculada, conteudo: conteudo, metodologia: metodologia, disciplina: disciplinaDetectada, repeticoes: grade[disciplinaDetectada].aulasPorDia });
                localStorage.setItem('fila_ponto_id', JSON.stringify(fila));

                contadores[disciplinaDetectada] = indiceSemana + 1;
                localStorage.setItem('contadores_pontoid', JSON.stringify(contadores));
                atualizarInterface();
            }
        }
    });

    async function executarRobo() {
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        if (fila.length === 0) return alert("Fila vazia!");
        if (!confirm(`🚀 Iniciar? Aulas permanecerão salvas para a próxima turma.`)) return;

        for (let aula of fila) {
            let dataVigente = aula.data;
            for (let j = 0; j < aula.repeticoes; j++) {
                let dataAceita = false;

                while (!dataAceita) {
                    document.querySelector('button[onclick*="redirecionarParaTelaDeAdicaoDeConteudo"]').click();
                    await sleep(2500);

                    // 1. Aplica a Data
                    let campoData = document.querySelector('#DataAula');
                    campoData.value = dataVigente;
                    campoData.dispatchEvent(new Event('input', { bubbles: true }));
                    campoData.dispatchEvent(new Event('change', { bubbles: true }));

                    // Espera estendida para garantir que a data dispare a consulta no servidor
                    await sleep(2000);

                    // 2. Verifica Feriado
                    if (document.body.innerText.includes("não é um dia letivo")) {
                        console.log(`Feriado em ${dataVigente}. Empurrando data...`);
                        document.querySelectorAll('button').forEach(b => { if(b.innerText.trim().toUpperCase() === 'OK') b.click(); });
                        await sleep(1000);
                        document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('Fechar')) b.click(); });
                        await sleep(1500);

                        let p = dataVigente.split('/');
                        let dObj = new Date(p[2], p[1]-1, p[0]);
                        dObj.setDate(dObj.getDate() + 7);
                        dataVigente = String(dObj.getDate()).padStart(2,'0')+'/'+String(dObj.getMonth()+1).padStart(2,'0')+'/'+dObj.getFullYear();
                    } else {
                        dataAceita = true;
                    }
                }

                // 3. A MÁGICA: Espera o servidor carregar e seleciona a matéria invisivelmente
                let selecionouComSucesso = await selecionarDisciplinaComRadar(aula.disciplina);

                if (!selecionouComSucesso) {
                    alert(`❌ ERRO: O sistema do colégio não liberou a matéria [${aula.disciplina}] para a data [${dataVigente}].\n\nIsso geralmente acontece se não houver horário cadastrado para essa matéria neste dia da semana.`);
                    return;
                }

                // 4. Preenche os Textos e Salva
                let caixas = document.querySelectorAll('textarea[id^="ItemDoAgrupador_"]');
                if (caixas.length >= 2) {
                    caixas[0].value = aula.conteudo; caixas[1].value = aula.metodologia;
                    caixas[0].dispatchEvent(new Event('input', { bubbles: true })); caixas[1].dispatchEvent(new Event('input', { bubbles: true }));
                    caixas[0].dispatchEvent(new Event('change', { bubbles: true })); caixas[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
                await sleep(500);

                document.querySelector('button[onclick*="onClickSalvarConteudo"]').click();
                await sleep(4000);
            }
        }
        alert("🎉 Turma concluída com sucesso! Os lançamentos estão seguros no diário.");
    }

    let container = document.createElement("div");
    container.style = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";

    let btnRodar = document.createElement("button");
    btnRodar.style = "padding: 15px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.3);";
    btnRodar.onclick = executarRobo;

    let btnLimpar = document.createElement("button");
    btnLimpar.innerHTML = "🗑️ Limpar Mochila";
    btnLimpar.style = "padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; opacity: 0.8;";
    btnLimpar.onclick = () => {
        if(confirm("Esvaziar a mochila agora?")) {
            localStorage.removeItem('fila_ponto_id');
            localStorage.removeItem('contadores_pontoid');
            localStorage.removeItem('config_data_pontoid');
            atualizarInterface();
        }
    };

    container.appendChild(btnLimpar);
    container.appendChild(btnRodar);
    document.body.appendChild(container);

    function atualizarInterface() {
        let fila = JSON.parse(localStorage.getItem('fila_ponto_id') || '[]');
        btnRodar.innerHTML = `🚀 Rodar em Turma (${fila.length} Blocos)`;
        btnRodar.style.display = fila.length === 0 ? "none" : "block";
        btnLimpar.style.display = fila.length === 0 ? "none" : "block";
    }
    atualizarInterface();

})();
