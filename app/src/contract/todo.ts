export type Todo = {
  "version": "0.1.0";
  "name": "todo";
  "instructions": [
    {
      "name": "newList";
      "accounts": [
        {
          "name": "list";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "user";
          "isMut": true;
          "isSigner": true;
        },
        {
          "name": "systemProgram";
          "isMut": false;
          "isSigner": false;
        }
      ];
      "args": [
        {
          "name": "name";
          "type": "string";
        },
        {
          "name": "capacity";
          "type": "u16";
        },
        {
          "name": "accountBump";
          "type": "u8";
        }
      ];
    },
    {
      "name": "add";
      "accounts": [
        {
          "name": "list";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "listOwner";
          "isMut": false;
          "isSigner": false;
        },
        {
          "name": "item";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "user";
          "isMut": true;
          "isSigner": true;
        },
        {
          "name": "systemProgram";
          "isMut": false;
          "isSigner": false;
        }
      ];
      "args": [
        {
          "name": "listName";
          "type": "string";
        },
        {
          "name": "itemName";
          "type": "string";
        },
        {
          "name": "bounty";
          "type": "u64";
        }
      ];
    },
    {
      "name": "cancel";
      "accounts": [
        {
          "name": "list";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "listOwner";
          "isMut": false;
          "isSigner": false;
        },
        {
          "name": "item";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "itemCreator";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "user";
          "isMut": false;
          "isSigner": true;
        }
      ];
      "args": [
        {
          "name": "listName";
          "type": "string";
        }
      ];
    },
    {
      "name": "finish";
      "accounts": [
        {
          "name": "list";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "listOwner";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "item";
          "isMut": true;
          "isSigner": false;
        },
        {
          "name": "user";
          "isMut": false;
          "isSigner": true;
        }
      ];
      "args": [
        {
          "name": "listName";
          "type": "string";
        }
      ];
    }
  ];
  "accounts": [
    {
      "name": "listItem";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "creator";
            "type": "publicKey";
          },
          {
            "name": "creatorFinished";
            "type": "bool";
          },
          {
            "name": "listOwnerFinished";
            "type": "bool";
          },
          {
            "name": "bump";
            "type": "u8";
          },
          {
            "name": "name";
            "type": "string";
          }
        ];
      };
    },
    {
      "name": "todoList";
      "type": {
        "kind": "struct";
        "fields": [
          {
            "name": "listOwner";
            "type": "publicKey";
          },
          {
            "name": "bump";
            "type": "u8";
          },
          {
            "name": "capacity";
            "type": "u16";
          },
          {
            "name": "name";
            "type": "string";
          },
          {
            "name": "lines";
            "type": {
              "vec": "publicKey";
            };
          }
        ];
      };
    }
  ];
  "errors": [
    {
      "code": 6000;
      "name": "ListFull";
      "msg": "This list is full";
    },
    {
      "code": 6001;
      "name": "BountyTooSmall";
      "msg": "Bounty must be enough to mark account rent-exempt";
    },
    {
      "code": 6002;
      "name": "CancelPermissions";
      "msg": "Only the list owner or item creator may cancel an item";
    },
    {
      "code": 6003;
      "name": "FinishPermissions";
      "msg": "Only the list owner or item creator may finish an item";
    },
    {
      "code": 6004;
      "name": "ItemNotFound";
      "msg": "Item does not belong to this todo list";
    },
    {
      "code": 6005;
      "name": "WrongListOwner";
      "msg": "Specified list owner does not match the pubkey in the list";
    },
    {
      "code": 6006;
      "name": "WrongItemCreator";
      "msg": "Specified item creator does not match the pubkey in the item";
    }
  ];
};

export const IDL: Todo = {
  "version": "0.1.0",
  "name": "todo",
  "instructions": [
    {
      "name": "newList",
      "accounts": [
        {
          "name": "list",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true,
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
        },
      ],
      "args": [
        {
          "name": "name",
          "type": "string",
        },
        {
          "name": "capacity",
          "type": "u16",
        },
        {
          "name": "accountBump",
          "type": "u8",
        },
      ],
    },
    {
      "name": "add",
      "accounts": [
        {
          "name": "list",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "listOwner",
          "isMut": false,
          "isSigner": false,
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true,
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false,
        },
      ],
      "args": [
        {
          "name": "listName",
          "type": "string",
        },
        {
          "name": "itemName",
          "type": "string",
        },
        {
          "name": "bounty",
          "type": "u64",
        },
      ],
    },
    {
      "name": "cancel",
      "accounts": [
        {
          "name": "list",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "listOwner",
          "isMut": false,
          "isSigner": false,
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "itemCreator",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": true,
        },
      ],
      "args": [
        {
          "name": "listName",
          "type": "string",
        },
      ],
    },
    {
      "name": "finish",
      "accounts": [
        {
          "name": "list",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "listOwner",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "item",
          "isMut": true,
          "isSigner": false,
        },
        {
          "name": "user",
          "isMut": false,
          "isSigner": true,
        },
      ],
      "args": [
        {
          "name": "listName",
          "type": "string",
        },
      ],
    },
  ],
  "accounts": [
    {
      "name": "listItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey",
          },
          {
            "name": "creatorFinished",
            "type": "bool",
          },
          {
            "name": "listOwnerFinished",
            "type": "bool",
          },
          {
            "name": "bump",
            "type": "u8",
          },
          {
            "name": "name",
            "type": "string",
          },
        ],
      },
    },
    {
      "name": "todoList",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listOwner",
            "type": "publicKey",
          },
          {
            "name": "bump",
            "type": "u8",
          },
          {
            "name": "capacity",
            "type": "u16",
          },
          {
            "name": "name",
            "type": "string",
          },
          {
            "name": "lines",
            "type": {
              "vec": "publicKey",
            },
          },
        ],
      },
    },
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ListFull",
      "msg": "This list is full",
    },
    {
      "code": 6001,
      "name": "BountyTooSmall",
      "msg": "Bounty must be enough to mark account rent-exempt",
    },
    {
      "code": 6002,
      "name": "CancelPermissions",
      "msg": "Only the list owner or item creator may cancel an item",
    },
    {
      "code": 6003,
      "name": "FinishPermissions",
      "msg": "Only the list owner or item creator may finish an item",
    },
    {
      "code": 6004,
      "name": "ItemNotFound",
      "msg": "Item does not belong to this todo list",
    },
    {
      "code": 6005,
      "name": "WrongListOwner",
      "msg": "Specified list owner does not match the pubkey in the list",
    },
    {
      "code": 6006,
      "name": "WrongItemCreator",
      "msg": "Specified item creator does not match the pubkey in the item",
    },
  ],
};
