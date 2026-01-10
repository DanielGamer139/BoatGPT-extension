// BoatGPT – Multi-instance Groq-powered chat extension
// Now with a simple data store + image/data pipeline + base64 shrinker.

(function (Scratch) {
  'use strict';

  if (!Scratch || !Scratch.extensions || !Scratch.vm) {
    console.error('BoatGPT extension: Scratch runtime not found.');
    return;
  }

  // ------------------------------------------------------------
  // Global helper: shrink base64 images to Scratch-safe size
  // ------------------------------------------------------------
  async function shrinkBase64(base64, maxSize = 128) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const shrunk = canvas.toDataURL('image/png');
        resolve(shrunk);
      };
      img.onerror = reject;
      img.src = base64;
    });
  }

  class BoatGPT {
    constructor(runtime) {
      this.runtime = runtime;

      this.instances = {};
      this.dataStore = {};

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
      return this.instances[id] || null;
    }

    _buildMessages(inst, userText, useHistory) {
      const messages = [];

      messages.push({
        role: 'system',
        content: inst.role || 'You are BoatGPT, an AI character.'
      });

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const data = await response.json();

      const reply =
        data?.choices?.[0]?.message?.content
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
          {
            opcode: 'createInstance',
            blockType: Scratch.BlockType.COMMAND,
            text: 'create BoatGPT instance [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt2' }
            }
          },
          {
            opcode: 'listInstances',
            blockType: Scratch.BlockType.REPORTER,
            text: 'all BoatGPT instance IDs'
          },
          {
            opcode: 'deleteInstance',
            blockType: Scratch.BlockType.COMMAND,
            text: 'delete instance [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt2' }
            }
          },
          {
            opcode: 'deleteAllInstances',
            blockType: Scratch.BlockType.COMMAND,
            text: 'delete all instances'
          },

          {
            opcode: 'setRole',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set role of [ID] to [ROLE]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' },
              ROLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'You are a friendly NPC.' }
            }
          },
          {
            opcode: 'getRole',
            blockType: Scratch.BlockType.REPORTER,
            text: 'role of [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' }
            }
          },

          {
            opcode: 'ask',
            blockType: Scratch.BlockType.COMMAND,
            text: 'ask [ID] [TEXT]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' },
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' }
            }
          },
          {
            opcode: 'quickAsk',
            blockType: Scratch.BlockType.REPORTER,
            text: 'quick ask [ID] [TEXT]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' },
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Say something' }
            }
          },
          {
            opcode: 'latestResponse',
            blockType: Scratch.BlockType.REPORTER,
            text: 'latest response of [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' }
            }
          },
          {
            opcode: 'clearMemory',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear memory of [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' }
            }
          },

          // ------------------------------------------------------
          // Data / image pipeline blocks
          // ------------------------------------------------------
          {
            opcode: 'analyzeImage',
            blockType: Scratch.BlockType.COMMAND,
            text: 'analyze image from [BASE64] and save as data [KEY]',
            arguments: {
              BASE64: { type: Scratch.ArgumentType.STRING, defaultValue: 'data:image/png;base64,...' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'vision' }
            }
          },
          {
            opcode: 'askAboutData',
            blockType: Scratch.BlockType.REPORTER,
            text: 'ask [ID] about data [KEY]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'boatgpt' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'vision' }
            }
          },
          {
            opcode: 'getData',
            blockType: Scratch.BlockType.REPORTER,
            text: 'data [KEY]',
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'vision' }
            }
          },
          {
            opcode: 'clearData',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear data [KEY]',
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'vision' }
            }
          }
        ]
      };
    }

    // ------------------------------------------------------------
    // Instance management
    // ------------------------------------------------------------

    createInstance(args) {
      const id = String(args.ID || '').trim();
      if (!id) return;
      this._createInstanceIfMissing(id);
    }

    listInstances() {
      return Object.keys(this.instances).join(',');
    }

    deleteInstance(args) {
      const id = String(args.ID || '').trim();
      if (!id || id === 'boatgpt') return;
      delete this.instances[id];
    }

    deleteAllInstances() {
      this.instances = {};
      this._createInstanceIfMissing('boatgpt');
    }

    // ------------------------------------------------------------
    // Role management
    // ------------------------------------------------------------

    setRole(args) {
      const id = String(args.ID || '').trim();
      if (!id) return;
      this._createInstanceIfMissing(id);
      this.instances[id].role = String(args.ROLE || '');
    }

    getRole(args) {
      const id = String(args.ID || '').trim();
      return this.instances[id]?.role || '';
    }

    // ------------------------------------------------------------
    // Chat blocks
    // ------------------------------------------------------------

    async ask(args) {
      const id = String(args.ID || '').trim();
      const text = String(args.TEXT || '');
      if (!id || !text) return;

      this._createInstanceIfMissing(id);
      const inst = this.instances[id];

      try {
        const messages = this._buildMessages(inst, text, true);
        const reply = await this._callGroq(messages);

        inst.latest = reply;
        inst.history.push({ role: 'user', content: text });
        inst.history.push({ role: 'assistant', content: reply });
      } catch (e) {
        inst.latest = 'BoatGPT/Groq Error: ' + e;
      }
    }

    async quickAsk(args) {
      const id = String(args.ID || '').trim();
      const text = String(args.TEXT || '');
      if (!id || !text) return '';

      this._createInstanceIfMissing(id);
      const inst = this.instances[id];

      try {
        const messages = this._buildMessages(inst, text, false);
        const reply = await this._callGroq(messages);
        inst.latest = reply;
        return reply;
      } catch (e) {
        inst.latest = 'BoatGPT/Groq Error: ' + e;
        return inst.latest;
      }
    }

    latestResponse(args) {
      const id = String(args.ID || '').trim();
      return this.instances[id]?.latest || '';
    }

    clearMemory(args) {
      const id = String(args.ID || '').trim();
      if (!this.instances[id]) return;
      this.instances[id].history = [];
      this.instances[id].latest = '';
    }

// ------------------------------------------------------------
// Data / image pipeline
// ------------------------------------------------------------

async analyzeImage(args) {
  const rawBase64 = String(args.BASE64 || '');
  const key = String(args.KEY || '').trim();
  if (!rawBase64 || !key) return;

  try {
    // shrink the image before sending
    const base64 = await shrinkBase64(rawBase64);

    const response = await fetch(
      'https://boatgpt-vision.danielmat639.workers.dev/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      }
    );

    // If the worker fails (non-2xx), store a useful message
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const msg = `Vision HTTP ${response.status}${text ? `: ${text}` : ''}`;
      this.dataStore[key] = 'Vision error: ' + msg;
      console.warn('BoatGPT Vision non-OK response:', response.status, text);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      this.dataStore[key] = 'Vision error: Invalid JSON from worker';
      console.error('BoatGPT Vision JSON parse error:', parseErr);
      return;
    }

    console.log('BoatGPT Vision raw response:', data);

    // NEW: read the final caption from your updated Worker
    const caption = data?.result;
    const labels = data?.labels;

    if (caption) {
      // Store caption as the main result
      this.dataStore[key] = caption;

      // Optionally store labels too
      if (labels) {
        this.dataStore[key + "_labels"] = JSON.stringify(labels);
      }
    } else if (data?.error) {
      this.dataStore[key] = 'Vision error: ' + data.error;
    } else {
      this.dataStore[key] = 'Vision returned no result';
    }

  } catch (e) {
    this.dataStore[key] = 'BoatGPT analyze error: ' + e;
    console.error('BoatGPT analyzeImage error:', e);
  }
}
    async askAboutData(args) {
      const id = String(args.ID || '').trim();
      const key = String(args.KEY || '').trim();
      if (!id || !key) return '';

      this._createInstanceIfMissing(id);
      const inst = this.instances[id];

      const data = this.dataStore[key] || '';
      const userText = `Analyze this data labeled "${key}":\n${data}`;

      try {
        const messages = this._buildMessages(inst, userText, true);
        const reply = await this._callGroq(messages);

        inst.latest = reply;
        inst.history.push({ role: 'user', content: `[DATA:${key}] ${userText}` });
        inst.history.push({ role: 'assistant', content: reply });

        return reply;
      } catch (e) {
        inst.latest = 'BoatGPT/Groq Error: ' + e;
        return inst.latest;
      }
    }

    getData(args) {
      const key = String(args.KEY || '').trim();
      // If nothing stored, return empty string (Scratch-friendly),
      // but since analyzeImage now always stores a message,
      // blank will only happen if analyzeImage never ran.
      return this.dataStore[key] ?? '';
    }

    clearData(args) {
      const key = String(args.KEY || '').trim();
      delete this.dataStore[key];
    }
  }

  Scratch.extensions.register(new BoatGPT(Scratch.vm));
})(Scratch);
