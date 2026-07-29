import worker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    return worker.fetch(request, env, ctx);
  }
};
