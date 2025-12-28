// IOOOOOOOOOOO
// I           OOOO
// I               O
// I               O
// I           OOOO
// IOOOOOOOOOOO
// I           OOOO
// I               O
// I               O
// I               O
// I               O
// I           OOOO
// IOOOOOOOOOOO

//  BoatGPT the amazing extension
// Based off IceGPT, which is based off PenguinGPT.
// And uhhhhhhhh
// Roles exist in this version of IceGPT!!!!!!!
// hooray


(function(Scratch) {
  'use strict';

class BoatGPT {
    constructor(runtime) {
        this.runtime = runtime;
        this.lastResponse = "";
        this.history = [];
        this.role = "You are BoatGPT, an AI chatbot. You aren't currently assigned a special role.";
    }

    setRole(args) {
        this.role = String(args.ROLE);
    }

    getRole() {
        return this.role;
    }
}
    getInfo() {
      return {
        id: 'boatgpt',
        name: 'BoatGPT',
        blocks: [
          {
            opcode: 'ask',
            blockType: Scratch.BlockType.COMMAND,
            text: 'ask BoatGPT [TEXT]',
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello BoatGPT!' }
            }
          },
          {
            opcode: 'quickAsk',
            blockType: Scratch.BlockType.REPORTER,
            text: 'quick ask BoatGPT [TEXT]',
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Say something' }
            }
          },
          {
            opcode: 'latestResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: 'latest response'
          },
          {
            opcode: 'clearMemory',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear BoatGPT memory'
          }
          {
            "opcode": "setRole",
            "blockType": "command",
            "text": "assign role [ROLE]",
            "arguments": {
            "ROLE": {
             "type": "string",
             "defaultValue": "You are a friendly NPC."
              }
        }
    }
              {
              "opcode": "getRole",
              "blockType": "reporter",
              "text": "current role"
              }

        ]
      };
    }

    async ask(args) {
      const prompt = args.TEXT;

      const body = {
        model: "llama-3.1-8b-instant",
        messages: [
    { role: "system", content: this.role },
    ...this.history,
    { role: "user", content: prompt }
]
      };

      try {
        const response = await fetch("https://boatgpt-groq.danielmat639.workers.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log("DEBUG:", data);

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
          const reply = data.choices[0].message.content;

          this.lastResponse = reply;

          this.history.push({ role: "user", content: prompt });
          this.history.push({ role: "assistant", content: reply });
        } else {
          this.lastResponse = "BoatGPT/Groq Error: " + JSON.stringify(data);
        }

      } catch (e) {
        this.lastResponse = "BoatGPT/Groq Error: " + e;
      }
    }

    async quickAsk(args) {
      await this.ask(args);
      return this.lastResponse;
    }

    latestResponse() {
      return this.lastResponse;
    }

    clearMemory() {
      this.history = [];
      this.lastResponse = "";
    }
  }

  Scratch.extensions.register(new BoatGPT());
})(Scratch);
