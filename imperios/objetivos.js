/* IMPÉRIOS — CARLUDIX · objetivos secretos (dados da Fase 2)
   Cada jogador recebe 1. Ao concluir: revelado e pontuado uma única vez (pontos permanentes).
   'requer' filtra objetivos impossíveis para o mapa/configuração da partida. */
(function (G) {
  'use strict';
  const PONTOS = 10;
  const OBJETIVOS = [
    // Domínio
    { id: 'expansao-imperial', nome: 'Expansão Imperial', grupo: 'dominio', txt: 'Controlar 8 territórios ao mesmo tempo.', alvo: 8 },
    { id: 'dominio-continental', nome: 'Domínio Continental', grupo: 'dominio', txt: 'Controlar uma região inteira do mapa.' },
    { id: 'senhor-dos-mares', nome: 'Senhor dos Mares', grupo: 'dominio', txt: 'Ter 2 portos ao mesmo tempo.', alvo: 2 },
    { id: 'mestre-das-fortalezas', nome: 'Mestre das Fortalezas', grupo: 'dominio', txt: 'Ter 3 fortalezas ao mesmo tempo.', alvo: 3 },
    { id: 'conquistador-de-capitais', nome: 'Conquistador de Capitais', grupo: 'dominio', txt: 'Conquistar a capital original de um rival.' },
    // Prosperidade
    { id: 'reino-prospero', nome: 'Reino Próspero', grupo: 'prosperidade', txt: 'Controlar ao mesmo tempo planície, floresta, montanha e mina.' },
    { id: 'magnata-do-ouro', nome: 'Magnata do Ouro', grupo: 'prosperidade', txt: 'Ter 15 ouros guardados no fim do seu turno.', alvo: 15 },
    { id: 'mestre-do-comercio', nome: 'Mestre do Comércio', grupo: 'prosperidade', txt: 'Fazer 5 idas ao mercado ou trocas com jogadores.', alvo: 5 },
    { id: 'celeiro-imperial', nome: 'Celeiro Imperial', grupo: 'prosperidade', txt: 'Controlar 3 planícies ao mesmo tempo.', alvo: 3 },
    { id: 'grande-construtor', nome: 'Grande Construtor', grupo: 'prosperidade', txt: 'Construir 2 castelos além do castelo inicial.', alvo: 2 },
    // Supremacia militar e diplomacia
    { id: 'exercito-invencivel', nome: 'Exército Invencível', grupo: 'militar', txt: 'Vencer 3 batalhas como atacante.', alvo: 3 },
    { id: 'mestre-da-cavalaria', nome: 'Mestre da Cavalaria', grupo: 'militar', txt: 'Ter 4 cavalarias ao mesmo tempo.', alvo: 4 },
    { id: 'guardiao-do-reino', nome: 'Guardião do Reino', grupo: 'militar', txt: 'Resistir a 2 ataques de outros reinos.', alvo: 2 },
    { id: 'grande-diplomata', nome: 'Grande Diplomata', grupo: 'militar', txt: 'Manter 2 tratados ativos ao mesmo tempo (aliança, paz ou trégua).', alvo: 2, requer: { cartas: true, minJogadores: 3 } },
    { id: 'alianca-dos-reis', nome: 'Aliança dos Reis', grupo: 'militar', txt: 'Ter uma aliança aceita e chegar ao fim dela sem atacar o aliado.', requer: { cartas: true } },
    // Legado
    { id: 'maravilha-do-mundo', nome: 'Maravilha do Mundo', grupo: 'legado', txt: 'Construir uma maravilha.' },
    { id: 'mestre-dos-recursos', nome: 'Mestre dos Recursos', grupo: 'legado', txt: 'Ter 8 de cada recurso no fim do seu turno.', alvo: 8 },
    { id: 'imperio-das-cidades', nome: 'Império das Cidades', grupo: 'legado', txt: 'Ter 3 cidades ao mesmo tempo.', alvo: 3 },
    { id: 'explorador-dos-reinos', nome: 'Explorador dos Reinos', grupo: 'legado', txt: 'Controlar territórios em 3 regiões diferentes ao mesmo tempo.', alvo: 3 },
    { id: 'legado-eterno', nome: 'Legado Eterno', grupo: 'legado', txt: 'Somar 18 pontos só em construções ao mesmo tempo.', alvo: 18 },
  ];
  G.ImperiosObjetivos = { OBJETIVOS, PONTOS, img: id => `img/objetivo-${id}.webp` };
})(typeof window !== 'undefined' ? window : globalThis);
