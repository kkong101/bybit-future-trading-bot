const { getAxios } = require("../http/index");
const { checkNullish } = require("../utils/index");
const { trade } = require("../globalState/index");

module.exports = {
  setBalance: async () => {
    const res = await getAxios("/v2/private/wallet/balance");
    if (checkNullish(res)) return;
    if (res.ret_msg == "OK") {
      trade.total_money = res.result.USDT.available_balance;
    }
  },
};
