const { postAxios, getAxios } = require("../axios/index");
const coins = require("../COINS.json");
const { trade } = require("../globalState/index");

module.exports = {
  cancelAll: () => {
    // 일단 lock 걸어줌.
    trade.is_circuit_breaker = true;

    coins.white_list.forEach(async (e) => {
      const res = await getAxios("/private/linear/order/list", {
        symbol: e.symbol,
        order_status: "New",
      });
      let order_list = [];
      if (res.result.data != undefined) {
        res.result.data.forEach((e) => {
          order_list.push(e.order_id);
        });
      }

      order_list.forEach(async (order_id) => {
        await postAxios("/private/linear/order/cancel", {
          symbol: e.symbol,
          order_id: order_id,
        }).then((res) => {
          // rate_limit를 초과할 시
          if (res.rate_limit_status == "0") {
            const after_time = parseInt(res.rate_limit_reset_ms) - Date.now();
            console.log("after_time : ", after_time);
            setTimeout(async () => {
              await postAxios("/private/linear/order/cancel", {
                symbol: e.symbol,
                order_id: order_id,
              });

              setTimeout(() => {
                trade.is_circuit_breaker = false;
              }, 1000);
            }, after_time + 500);
          }

          if (res.ret_msg == "OK") {
            trade.is_circuit_breaker = false;
          }

          console.log(res);
        });
      });
    });
  },
  setBalance: async () => {
    const res = await getAxios("/v2/private/wallet/balance");
    if (res.ret_msg == "OK") {
      trade.total_money = res.result.USDT.available_balance;
    }
  },
};
