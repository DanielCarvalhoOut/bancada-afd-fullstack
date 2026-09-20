import { AutomatonKind, AutomatonModel } from '../domain/automaton';

/** Um item da lista de revisão (resposta de referência de uma questão). */
export interface RevisaoItem {
  name: string;
  kind: AutomatonKind;
  model: AutomatonModel;
}

/**
 * Lista da prova — autômatos de referência (Q1–Q6). Embutida no bundle e
 * semeada na Biblioteca (localStorage) no primeiro acesso, para servir de
 * gabarito no "Comparar". Estática; não depende de backend.
 */
export const REVISAO: RevisaoItem[] = [
  {
    "name": "Revisão LFA · Q1 — AFD M do enunciado",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "S0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "S1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "S2",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "S3",
          "initial": false,
          "accepting": true,
          "x": 870,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2a — não contém 001",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q2",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2b — contém 1110",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q2",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "q3",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "q4",
          "initial": false,
          "accepting": true,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2c — não é a palavra 011",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "ε",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "p0",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "p01",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "p011",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "X",
          "initial": false,
          "accepting": true,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s4",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2d — começa com 10 e termina com 1",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q2",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "q3",
          "initial": false,
          "accepting": true,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s4",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2e — não é a palavra 101",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "ε",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "p1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "p10",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "p101",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "X",
          "initial": false,
          "accepting": true,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s4",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2f — contém 010 ou é ε",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "i",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q0",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q1",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "q2",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "q3",
          "initial": false,
          "accepting": true,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2g — começa e termina com símbolos diferentes",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "i",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "A0",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "A1",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "B1",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "B0",
          "initial": false,
          "accepting": true,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s4",
          "to": "s3",
          "symbols": [
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2h — não contém 101",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q2",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2i — não contém 00",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2j — dois primeiros símbolos diferentes",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "i",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "a",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "b",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "Y",
          "initial": false,
          "accepting": true,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s4",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2k/Q2n — qualquer palavra menos 10",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "ε",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "p1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "p10",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "X",
          "initial": false,
          "accepting": true,
          "x": 870,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2l — não contém 10",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2m — pelo menos dois 1s e um 0",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "u0z0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "u1z0",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "u2z0",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "u0z1",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "u1z1",
          "initial": false,
          "accepting": false,
          "x": 180,
          "y": 400
        },
        {
          "id": "s5",
          "name": "u2z1",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s5",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s4",
          "to": "s5",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s5",
          "to": "s5",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2o — exatamente três 0s",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "c0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "c1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "c2",
          "initial": false,
          "accepting": false,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "c3",
          "initial": false,
          "accepting": true,
          "x": 870,
          "y": 200
        },
        {
          "id": "s4",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 180,
          "y": 400
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s4",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s4",
          "to": "s4",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q2p — sem 00 e sem 11 consecutivos",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "i",
          "initial": true,
          "accepting": true,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "u0",
          "initial": false,
          "accepting": true,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "u1",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        },
        {
          "id": "s3",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 870,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s3",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "0",
            "1"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q4 — AFN do enunciado (Σ = {a, b, c})",
    "kind": "afn",
    "model": {
      "kind": "afn",
      "alphabet": [
        "a",
        "b",
        "c"
      ],
      "states": [
        {
          "id": "s0",
          "name": "S0",
          "initial": true,
          "accepting": false,
          "x": 200,
          "y": 300
        },
        {
          "id": "s1",
          "name": "S1",
          "initial": false,
          "accepting": false,
          "x": 430,
          "y": 300
        },
        {
          "id": "s2",
          "name": "S2",
          "initial": false,
          "accepting": true,
          "x": 660,
          "y": 300
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "a"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "ε"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "b"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "ε"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "c"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q5 — AFD mínimo do AFN da Q4",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "a",
        "b",
        "c"
      ],
      "states": [
        {
          "id": "s0",
          "name": "A",
          "initial": true,
          "accepting": true,
          "x": 200,
          "y": 300
        },
        {
          "id": "s1",
          "name": "B",
          "initial": false,
          "accepting": true,
          "x": 430,
          "y": 300
        },
        {
          "id": "s2",
          "name": "C",
          "initial": false,
          "accepting": true,
          "x": 660,
          "y": 300
        },
        {
          "id": "s3",
          "name": "D",
          "initial": false,
          "accepting": false,
          "x": 430,
          "y": 520
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "a"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "b"
          ]
        },
        {
          "from": "s0",
          "to": "s2",
          "symbols": [
            "c"
          ]
        },
        {
          "from": "s1",
          "to": "s3",
          "symbols": [
            "a"
          ]
        },
        {
          "from": "s1",
          "to": "s1",
          "symbols": [
            "b"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "c"
          ]
        },
        {
          "from": "s2",
          "to": "s3",
          "symbols": [
            "a",
            "b"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "c"
          ]
        },
        {
          "from": "s3",
          "to": "s3",
          "symbols": [
            "a",
            "b",
            "c"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q6a — AFND: sufixo 00 (Σ+)",
    "kind": "afn",
    "model": {
      "kind": "afn",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "q0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "q1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "q2",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "0",
            "1"
          ]
        },
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        }
      ]
    }
  },
  {
    "name": "Revisão LFA · Q6c — AFD: sufixo 00 (Σ+)",
    "kind": "afd",
    "model": {
      "kind": "afd",
      "alphabet": [
        "0",
        "1"
      ],
      "states": [
        {
          "id": "s0",
          "name": "p0",
          "initial": true,
          "accepting": false,
          "x": 180,
          "y": 200
        },
        {
          "id": "s1",
          "name": "p1",
          "initial": false,
          "accepting": false,
          "x": 410,
          "y": 200
        },
        {
          "id": "s2",
          "name": "p2",
          "initial": false,
          "accepting": true,
          "x": 640,
          "y": 200
        }
      ],
      "transitions": [
        {
          "from": "s0",
          "to": "s1",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s0",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s1",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s1",
          "to": "s0",
          "symbols": [
            "1"
          ]
        },
        {
          "from": "s2",
          "to": "s2",
          "symbols": [
            "0"
          ]
        },
        {
          "from": "s2",
          "to": "s0",
          "symbols": [
            "1"
          ]
        }
      ]
    }
  }
];
