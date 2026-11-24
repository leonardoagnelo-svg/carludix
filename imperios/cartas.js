/* IMPÉRIOS — CARLUDIX · cartas especiais (dados da Fase 2; o efeito é aplicado pelo motor)
   24 tipos × 2 cópias = 48 cartas. Valores iniciais: serão ajustados pelas simulações.
   Regras: mão de até 5 · compra custa 2 ouros e 1 ação · no máximo 2 cartas por turno
   e no máximo 1 de sabotagem por turno · nenhuma carta conquista território sozinha
   · cartas de sabotagem nunca atingem a capital. */
(function (G) {
  'use strict';
  const CAT = { militar: 'Militar', comando: 'Comando', expansao: 'Expansão', economia: 'Economia', diplomacia: 'Diplomacia', evento: 'Evento', sabotagem: 'Sabotagem' };
  const MOM = { turno: 'No seu turno', ataque: 'Ao atacar', defesa: 'Quando for atacado' };
  const CARTAS = [
    { id: 'ataque-surpresa', nome: 'Ataque Surpresa', cat: 'militar', mom: 'ataque', txt: '+3 de ataque em uma batalha. Use na tela de ataque.', v: { atq: 3 } },
    { id: 'defesa-real', nome: 'Defesa Real', cat: 'militar', mom: 'defesa', txt: 'Fica de prontidão: quando um reino atacar você e a batalha estiver em risco, ela entra sozinha com +3 de defesa.', v: { def: 3 } },
    { id: 'marcha-forcada', nome: 'Marcha Forçada', cat: 'militar', mom: 'turno', txt: 'Uma movimentação sem gastar ação.', v: { movGratis: 1 } },
    { id: 'decreto-real', nome: 'Decreto Real', cat: 'comando', mom: 'turno', txt: '+1 ponto de ação neste turno.', v: { acoes: 1 } },
    { id: 'alianca', nome: 'Aliança', cat: 'diplomacia', mom: 'turno', txt: 'Propõe uma aliança de 2 rodadas: não se atacam e as tropas podem atravessar os territórios do aliado.', v: { rodadas: 2 } },
    { id: 'espionagem', nome: 'Espionagem', cat: 'diplomacia', mom: 'turno', txt: 'Veja as cartas na mão de um rival.', v: {} },
    { id: 'grande-colheita', nome: 'Grande Colheita', cat: 'economia', mom: 'turno', txt: 'Receba 4 alimentos.', v: { alimento: 4 } },
    { id: 'tesouro-perdido', nome: 'Tesouro Perdido', cat: 'economia', mom: 'turno', txt: 'Receba 4 ouros.', v: { ouro: 4 } },
    { id: 'extracao-de-madeira', nome: 'Extração de Madeira', cat: 'economia', mom: 'turno', txt: 'Receba 4 madeiras.', v: { madeira: 4 } },
    { id: 'mina-descoberta', nome: 'Mina Descoberta', cat: 'economia', mom: 'turno', txt: 'Receba 4 pedras.', v: { pedra: 4 } },
    { id: 'muralha-reforcada', nome: 'Muralha Reforçada', cat: 'militar', mom: 'turno', txt: '+3 de defesa em um território seu até o seu próximo turno.', v: { def: 3 } },
    { id: 'mercado-prospero', nome: 'Mercado Próspero', cat: 'economia', mom: 'turno', txt: 'Sua próxima troca no mercado sai 1 por 1 (até 4 recursos).', v: { taxa: 1, max: 4 } },
    { id: 'engenheiros-reais', nome: 'Engenheiros Reais', cat: 'economia', mom: 'turno', txt: 'Sua próxima construção custa 2 recursos a menos.', v: { desconto: 2 } },
    { id: 'recrutamento-real', nome: 'Recrutamento Real', cat: 'militar', mom: 'turno', txt: 'Um recrutamento sem gastar ação, com até 4 unidades (pagando o custo).', v: { max: 4 } },
    { id: 'reforcos-militares', nome: 'Reforços Militares', cat: 'militar', mom: 'turno', txt: 'Receba 1 cavalaria grátis na sua capital.', v: { cavalaria: 1 } },
    { id: 'expansao-territorial', nome: 'Expansão Territorial', cat: 'expansao', mom: 'turno', txt: 'Ocupe um território neutro desprotegido vizinho sem gastar ação.', v: {} },
    { id: 'tratado-de-paz', nome: 'Tratado de Paz', cat: 'diplomacia', mom: 'turno', txt: 'Propõe paz de 3 rodadas. Se aceita, os dois recebem 2 ouros.', v: { rodadas: 3, ouro: 2 } },
    { id: 'tregua', nome: 'Trégua', cat: 'diplomacia', mom: 'turno', txt: 'Você e um rival não podem se atacar até o fim da próxima rodada. Não vale duas vezes seguidas no mesmo rival e não protege de sabotagens.', v: { rodadas: 1 } },
    { id: 'tempestade', nome: 'Tempestade', cat: 'evento', mom: 'turno', txt: 'Todas as rotas marítimas ficam fechadas até o fim da rodada (para todos).', v: {} },
    { id: 'bloqueio-naval', nome: 'Bloqueio Naval', cat: 'militar', mom: 'turno', txt: 'Um território costeiro rival não usa o mar nem recruta navios até o seu próximo turno.', v: {} },
    { id: 'revolta', nome: 'Revolta', cat: 'sabotagem', mom: 'turno', txt: 'Um território rival sem castelo não produz no próximo turno do dono. Não vale na capital.', v: {} },
    { id: 'peste', nome: 'Peste', cat: 'sabotagem', mom: 'turno', txt: 'Um território rival perde 2 unidades, ficando com pelo menos 1. Não vale na capital.', v: { perde: 2 } },
    { id: 'desercao', nome: 'Deserção', cat: 'sabotagem', mom: 'turno', txt: 'Um rival perde 1 unidade num território que faz fronteira com você, ficando com pelo menos 1.', v: { perde: 1 } },
    { id: 'sabotagem', nome: 'Sabotagem', cat: 'sabotagem', mom: 'turno', txt: 'Rebaixa uma construção rival: castelo vira fortaleza, cidade vira vila; fortaleza, porto e vila são destruídos. Não vale no castelo da capital nem na maravilha.', v: {} },
  ];
  const REGRAS = { copias: 2, mao: 5, compraOuro: 2, maxPorTurno: 2, maxSabotagemPorTurno: 1, iniciais: 2 };
  G.ImperiosCartas = { CARTAS, CAT, MOM, REGRAS, img: id => `img/carta-${id}.webp` };
})(typeof window !== 'undefined' ? window : globalThis);
