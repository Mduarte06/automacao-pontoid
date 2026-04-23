# 🤖 Automação Ponto ID - Injeção de Planos de Ensino

Este repositório contém um script de automação (`UserScript`) desenvolvido em JavaScript puro (Vanilla JS) para otimizar o preenchimento de diários de classe no sistema Ponto ID. 

O software transforma horas de trabalho manual (cópia e colagem de textos repetitivos) em um processo autônomo de poucos cliques, lidando com regras de negócio complexas do calendário escolar e formulários reativos.

## ⚙️ Principais Funcionalidades

* **Extração e Sanitização de Dados (Web Scraping):** Captura o texto selecionado pelo usuário via atalho de teclado (`Ctrl+Shift+C`), faz o *parsing* (fatiamento) usando Expressões Regulares (RegEx) e separa os blocos de Conteúdo e Metodologia, removendo cabeçalhos e sujeiras visuais.
* **Motor de Calendário Inteligente:** Calcula dinamicamente as datas das aulas com base em um dicionário (`grade`) de disciplinas predefinido. O sistema entende quantas aulas ocorrem por dia e avança as semanas automaticamente.
* **Bypass de Feriados (Tratamento de Exceções):** Detecta alertas modais do sistema informando "dia não letivo", fecha a notificação, incrementa a data em 7 dias e tenta a injeção novamente, de forma 100% autônoma.
* **Manipulação de DOM Avançada (Select2):** Contorna a máscara visual da biblioteca Select2, forçando o disparo de eventos (`dispatchEvent` e JQuery triggers) para injetar o componente curricular diretamente no formulário reativo do site.
* **Gerenciamento de Estado (Local Storage):** Utiliza o `localStorage` do navegador para criar uma Fila (Queue) de aulas persistente. O usuário pode extrair dados de uma turma e ejetá-los em múltiplas outras turmas sem perder o estado da memória.

## 🚀 Como Usar

### Instalação
1. Instale a extensão **Tampermonkey** no seu navegador.
2. Clique [aqui](link_do_seu_arquivo_raw_aqui) para instalar o script diretamente (substitua por seu link Raw depois).

### Operação
1. **Captura:** Na página de origem (ex: 3º Ano), selecione com o mouse o texto da aula (garantindo que o nome da matéria como "ARTE" ou "MATEMÁTICA" esteja dentro da seleção).
2. Pressione `Ctrl + Shift + C`. O robô fará a limpeza e guardará a aula na memória. O botão verde no canto inferior direito mostrará quantos blocos estão na fila.
3. **Injeção:** Vá para a página de destino (ex: 2º Ano).
4. Clique no botão flutuante **"🚀 Rodar em Turma"**.
5. Solte o mouse e o teclado. O robô abrirá os modais, selecionará a matéria, preencherá a data, validará feriados, colará os textos e salvará as X aulas correspondentes àquela disciplina automaticamente.
6. Use o botão **"🗑️ Limpar Mochila"** apenas quando quiser esvaziar a memória para o próximo mês.

## 🛠️ Tecnologias Utilizadas
* JavaScript (ES6+)
* DOM API
* JSON & LocalStorage API
* Regex (Expressões Regulares)
