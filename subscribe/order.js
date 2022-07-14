const { WebsocketClient } = require("bybit-api");
const { queue } = require("../globalState/index");

module.exports = {
  /**
   * 포지션이 체결되는지 체크하는 부분
   */
  detectContractedPosition: (secretObj) => {
    const ws = new WebsocketClient(secretObj);

    ws.subscribe("execution");

    ws.on("update", async (data) => {
      for (const res of data.data) {
        for (const q of queue) {
          if (q.symbol == res.symbol && q.side == res.side) return;
        }
        queue.push({
          symbol: res.symbol,
          side: res.side,
        });
      }
    });
  },
};
