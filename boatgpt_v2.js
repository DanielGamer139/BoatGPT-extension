// BoatGPT – Multi-instance Groq-powered chat extension
// One extension, multiple BoatGPT "brains" identified by ID.

(function (Scratch) {
  'use strict';

  if (!Scratch || !Scratch.extensions || !Scratch.vm) {
    // Basic guard in case environment is weird
    console.error('BoatGPT extension: Scratch runtime not found.');
    return;
  }

  class BoatGPT {
    constructor(runtime) {
      this.runtime = runtime;

      // All instances live here, keyed by ID string.
      // Each instance: { role, history, latest }
      this.instances = {};

      // Ensure default instance exists.
      this._createInstanceIfMissing('boatgpt');
    }

    // ------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------

    _createInstanceIfMissing(id) {
      if (!this.instances[id]) {
        this.instances[id] = {
          role: 'You are BoatGPT, an AI character.',
          history: [],
          latest: ''
        };
      }
    }

    _getInstance(id) {
      if (!id) return null;
      if (!this.instances[id]) return null;
      return this.instances[id];
    }

    _buildMessages(inst, userText, useHistory) {
      const messages = [];

      // System / role message
      messages.push({
        role: 'system',
        content: inst.role || 'You are BoatGPT, an AI character.'
      });

      // Optional history
      if (useHistory && Array.isArray(inst.history)) {
        for (const msg of inst.history) {
          if (msg && msg.role && msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }
        }
      }

      // Current user message
      messages.push({
        role: 'user',
        content: userText
      });

      return messages;
    }

    async _callGroq(messages) {
      const body = {
        model: 'llama-3.1-8b-instant',
        messages
      };

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

      return reply;
    }

    // ------------------------------------------------------------
    // Scratch extension metadata
    // ------------------------------------------------------------
    getInfo() {
      return {
        id: 'boatgpt',
        name: 'BoatGPT',
        color1: '#1c8adb',
        color2: '#176ca6',
        color3: '#0f4a73',
        blocks: [
          // Instance management
          {
            opcode: 'createInstance',
            blockType: Scratch.BlockType.COMMAND,
            text: 'create BoatGPT instance [ID]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt2'
              }
            }
          },
          {
            opcode: 'listInstances',
            blockType: Scratch.BlockType.REPORTER,
            text: 'all BoatGPT instance IDs'
          },

          // Role management per instance
          {
            opcode: 'setRole',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set role of [ID] to [ROLE]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              },
              ROLE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'You are a friendly NPC.'
              }
            }
          },
          {
            opcode: 'getRole',
            blockType: Scratch.BlockType.REPORTER,
            text: 'role of [ID]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              }
            }
          },

          // Chat blocks per instance
          {
            opcode: 'ask',
            blockType: Scratch.BlockType.COMMAND,
            text: 'ask [ID] [TEXT]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello!'
              }
            }
          },
          {
            opcode: 'quickAsk',
            blockType: Scratch.BlockType.REPORTER,
            text: 'quick ask [ID] [TEXT]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Say something'
              }
            }
          },
          {
            opcode: 'latestResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: 'latest response of [ID]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              }
            }
          },
          {
            opcode: 'clearMemory',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear memory of [ID]',
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'boatgpt'
              }
            }
          }
        ]
      };
    }

    // ------------------------------------------------------------
    // Instance management blocks
    // ------------------------------------------------------------

    createInstance(args) {
      const id = String(args.ID || '').trim();
      if (!id) return;

      // Only create if it does not already exist
      if (!this.instances[id]) {
        this._createInstanceIfMissing(id);
      }
    }

    listInstances() {
      // Reporter returns a string; caller can split if needed.
      const ids = Object.keys(this.instances);
      return ids.join(',');
    }

    // ------------------------------------------------------------
    // Role management blocks
    // ------------------------------------------------------------

    setRole(args) {
      const id = String(args.ID || '').trim();
      if (!id) return;

      this._createInstanceIfMissing(id);
      const inst = this._getInstance(id);
      if (!inst) return;

      inst.role = String(args.ROLE || '');
    }

    getRole(args) {
      const id = String(args.ID || '').trim();
      const inst = this._getInstance(id);
      if (!inst) return '';
      return inst.role || '';
    }

    // ------------------------------------------------------------
    // Chat blocks
    // ------------------------------------------------------------

    async ask(args) {
      const id = String(args.ID || '').trim();
      const text = String(args.TEXT || '');

      if (!id || !text) return;

      this._createInstanceIfMissing(id);
      const inst = this._getInstance(id);
      if (!inst) return;

      try {
        const messages = this._buildMessages(inst, text, true);
        const reply = await this._callGroq(messages);

        // Update latest and history
        inst.latest = reply;
        inst.history.push({ role: 'user', content: text });
        inst.history.push({ role: 'assistant', content: reply });
      } catch (e) {
        const errMsg = 'BoatGPT/Groq Error: ' + e;
        inst.latest = errMsg;
      }
    }

    async quickAsk(args) {
      const id = String(args.ID || '').trim();
      const text = String(args.TEXT || '');

      if (!id || !text) return '';

      this._createInstanceIfMissing(id);
      const inst = this._getInstance(id);
      if (!inst) return '';

      try {
        const messages = this._buildMessages(inst, text, false);
        const reply = await this._callGroq(messages);

        // Update latest but do NOT store in history
        inst.latest = reply;
        return reply;
      } catch (e) {
        const errMsg = 'BoatGPT/Groq Error: ' + e;
        inst.latest = errMsg;
        return errMsg;
      }
    }

    latestResponse(args) {
      const id = String(args.ID || '').trim();
      const inst = this._getInstance(id);
      if (!inst) return '';
      return inst.latest || '';
    }

    clearMemory(args) {
      const id = String(args.ID || '').trim();
      const inst = this._getInstance(id);
      if (!inst) return;

      inst.history = [];
      inst.latest = '';
    }
  }

  Scratch.extensions.register(new BoatGPT(Scratch.vm));
})(Scratch);
