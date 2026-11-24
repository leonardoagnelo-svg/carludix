/* IMPÉRIOS — CARLUDIX · eventos mundiais (dados da Fase 2)
   Um evento é revelado no início de cada 2 rodadas, antes dos turnos, e vale até o próximo.
   tipo 'imediato': aplicado uma vez na revelação · 'continuo': vale enquanto o evento estiver ativo. */
(function (G) {
  'use strict';
  const EVENTOS = [
    { id: 'era-de-prosperidade', nome: 'Era de Prosperidade', sinal: '+', tipo: 'imediato', txt: 'Cada reino recebe 1 de cada recurso.' },
    { id: 'descoberta-de-riquezas', nome: 'Descoberta de Riquezas', sinal: '+', tipo: 'continuo', txt: 'Minas produzem 1 ouro a mais.' },
    { id: 'avanco-tecnologico', nome: 'Avanço Tecnológico', sinal: '+', tipo: 'continuo', txt: 'Florestas e montanhas produzem 1 a mais.' },
    { id: 'grande-construcao', nome: 'Grande Construção', sinal: '+', tipo: 'continuo', txt: 'A primeira construção de cada turno custa 1 madeira e 1 pedra a menos.' },
    { id: 'guerra-entre-reinos', nome: 'Guerra entre Reinos', sinal: '+', tipo: 'continuo', txt: 'O primeiro recrutamento de cada turno custa 1 ouro a menos.' },
    { id: 'descoberta-de-novas-rotas', nome: 'Descoberta de Novas Rotas', sinal: '+', tipo: 'continuo', txt: 'Quem tem porto recebe 2 ouros no início do turno, e o mercado fica 2 por 1 para todos.' },
    { id: 'movimento-religioso', nome: 'Movimento Religioso', sinal: '+', tipo: 'continuo', txt: 'Quem termina o turno sem atacar outro reino recebe 2 ouros.' },
    { id: 'alianca-global', nome: 'Aliança Global', sinal: '+', tipo: 'continuo', txt: 'Nenhuma capital pode ser atacada enquanto o evento durar.' },
    { id: 'fome-generalizada', nome: 'Fome Generalizada', sinal: '-', tipo: 'continuo', txt: 'A manutenção do exército custa 1 alimento a mais por turno.' },
    { id: 'epidemia', nome: 'Epidemia', sinal: '-', tipo: 'imediato', txt: 'Cada reino perde 1 unidade do seu maior exército (nunca deixa um território vazio).' },
    { id: 'revolta-popular', nome: 'Revolta Popular', sinal: '-', tipo: 'continuo', txt: 'Cidades produzem 1 a menos.' },
    { id: 'desastre-natural', nome: 'Desastre Natural', sinal: '-', tipo: 'continuo', txt: 'As rotas marítimas ficam fechadas.' },
  ];
  const REGRAS = { aCadaRodadas: 2, primeiroNaRodada: 2 };
  const VERSOS = { especiais: 'img/verso-especiais.webp', objetivos: 'img/verso-objetivos.webp', eventos: 'img/verso-eventos.webp' };
  G.ImperiosEventos = { EVENTOS, REGRAS, VERSOS, img: id => `img/evento-${id}.webp` };
})(typeof window !== 'undefined' ? window : globalThis);
