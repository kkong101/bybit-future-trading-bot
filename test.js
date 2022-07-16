const { getAxios, postAxios } = require("./http/index");
const { setBBInfo } = require("./indicator/index");
const { create_one_position } = require("./trade/order");
const { getSecretInfo } = require("./utils/index");
const { getCleanFloat } = require("./utils/index");

const ewfwef = async () => {
  const side = "Buy";
  params = {
    side: "Buy",
    symbol: "MANAUSDT",
    order_type: "Limit",
    price: 0.83,
    qty: 10,
    time_in_force: "GoodTillCancel",
    reduce_only: false,
    close_on_trigger: false,
    order_link_id: `${side}-${Date.now()}`,
    tp_trigger_by: "LastPrice",
    sl_trigger_by: "LastPrice",
  };

  const res = await postAxios("/private/linear/order/create", params);
  console.log(res);
};

ewfwef();
