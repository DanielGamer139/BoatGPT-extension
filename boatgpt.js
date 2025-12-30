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

// BoatGPT – Groq-powered chat extension
// Based off IceGPT / PenguinGPT, now with roles.

(function (Scratch) {
  'use strict';

  class BoatGPT {
    constructor(runtime) {
      this.runtime = runtime;
      this.history = [];
      this.latestResponse = '';
      this.role = 'You are BoatGPT, an AI chatbot. You are not currently assigned a special role.';
    }

    // ------------------------------------------------------------------
    // Scratch extension metadata
    // ------------------------------------------------------------------
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
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello BoatGPT!'
              }
            }
          },
          {
            opcode: 'quickAsk',
            blockType: Scratch.BlockType.REPORTER,
            text: 'quick ask BoatGPT [TEXT]',
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Say something'
              }
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
          },
          {
            opcode: 'setRole',
            blockType: Scratch.BlockType.COMMAND,
            text: 'assign role [ROLE]',
            arguments: {
              ROLE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'You are a friendly NPC.'
              }
            }
          },
          {
            opcode: 'getRole',
            blockType: Scratch.BlockType.REPORTER,
            text: 'current role'
          }
        ]
      };
    }

    // ------------------------------------------------------------------
    // Role system
    // ------------------------------------------------------------------
    setRole(args) {
      this.role = String(args.ROLE);
    }

    getRole() {
      return this.role;
    }

    // ------------------------------------------------------------------
    // Latest response reporter
    // ------------------------------------------------------------------
    latestResponse() {
      return this.latestResponse;
    }

    // ------------------------------------------------------------------
    // Clear memory
    // ------------------------------------------------------------------
    clearMemory() {
      this.history = [];
      this.latestResponse = '';
    }

    // ------------------------------------------------------------------
    // ASK (with memory) - COMMAND
    // ------------------------------------------------------------------
    async ask(args) {
      const prompt = String(args.TEXT ?? '');

      const body = {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: this.role },
          ...this.history,
          { role: 'user', content: prompt }
        ]
      };

      try {
        const response = await fetch(
          'https://boatgpt-groq.danielmat639.workers.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        const data = await response.json();
        const reply =
          data &&
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
            ? String(data.choices[0].message.content)
            : 'BoatGPT/Groq Error: Invalid response format';

        this.latestResponse = reply;

        this.history.push({ role: 'user', content: prompt });
        this.history.push({ role: 'assistant', content: reply });
      } catch (e) {
        this.latestResponse = 'BoatGPT/Groq Error: ' + e;
      }
    }

    // ------------------------------------------------------------------
    // QUICK ASK (no memory) - REPORTER
    // ------------------------------------------------------------------
    async quickAsk(args) {
      const prompt = String(args.TEXT ?? '');

      const body = {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: this.role },
          { role: 'user', content: prompt }
        ]
      };

      try {
        const response = await fetch(
          'https://boatgpt-groq.danielmat639.workers.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        const data = await response.json();
        const reply =
          data &&
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
            ? String(data.choices[0].message.content)
            : 'BoatGPT/Groq Error: Invalid response format';

        this.latestResponse = reply;
        return reply;
      } catch (e) {
        this.latestResponse = 'BoatGPT/Groq Error: ' + e;
        return this.latestResponse;
      }
    }
  }

  Scratch.extensions.register(new BoatGPT(Scratch.vm));
})(Scratch);
