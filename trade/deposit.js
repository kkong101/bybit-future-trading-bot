const { postAxios, getAxios } = require("../axios/index");
const coins = require("../COINS.json");
const { trade } = require("../globalState/index");

module.exports = {
  cancelAll: async () => {
    // 일단 lock 걸어줌.
    for (const cois of coins.white_list) {
      const res = await getAxios("/private/linear/order/list", {
        symbol: cois.symbol,
        order_status: "New",
      });
      let order_list = [];
      if (res.result.data != undefined) {
        for (const result of res.result.data) {
          order_list.push(result.order_id);
        }
      }
      for (const order_id of order_list) {
        await postAxios("/private/linear/order/cancel", {
          symbol: cois.symbol,
          order_id: order_id,
        }).then((res) => {
          // rate_limit를 초과할 시
          if (res.rate_limit_status == "0") {
            const after_time = parseInt(res.rate_limit_reset_ms) - Date.now();
            console.log("after_time : ", after_time);
            setTimeout(async () => {
              await postAxios("/private/linear/order/cancel", {
                symbol: cois.symbol,
                order_id: order_id,
              });
            }, after_time + 500);
          }

          if (res.ret_msg == "OK") {
            console.log("####### private/linear/order/cancel cancelALL 성공");
          } else {
            console.log("####### private/linear/order/cancel err");
            console.log(res);
          }
        });
      }
    }
  },
  setBalance: async () => {
    const res = await getAxios("/v2/private/wallet/balance");
    if (res.ret_msg == "OK") {
      trade.total_money = res.result.USDT.available_balance;
    }
  },
};
