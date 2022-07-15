/**
 * 자동 매매 봇을 시작시키는 부분
 */

const { getSecretInfo, sleep } = require("./utils/index");
const { get_coin_info } = require("./coinInfo/index");
const { detectContractedPosition } = require("./subscribe/order");
const { setCurrentPrice } = require("./subscribe/price");
const { queue } = require("./globalState/index");
const { check_close_position, check_modify_order } = require("./check");
const {
  check_on_position_list,
  check_limit_order_list,
} = require("./trade/check");
const { setBBInfo } = require("./indicator/index");
const { white_list } = require("./COINS.json");
const TEST = require("./globalState/index");
const { create_one_position } = require("./trade/order");

const main = async () => {
  const updateSecretObj = getSecretInfo(true);
  const secretObj = getSecretInfo(false);

  // 시작되는 부분
  await get_coin_info();
  for (const coin of white_list) {
    await setBBInfo(coin.symbol);
  }

  detectContractedPosition(updateSecretObj);
  setCurrentPrice(secretObj);

  sleep(4 * 1000);

  let prevMin = 0;
  // BB Indicator 정보 세팅하는 부분
  setInterval(() => {
    console.log(TEST.coin_info);
    const newMin = new Date().getMinutes();
    if (newMin == prevMin) return;
    for (const coin of white_list) {
      setBBInfo(coin.symbol);
    }
    prevMin = newMin;
  }, 1000);

  setInterval(() => {
    check_modify_order;
  }, 3000);

  // queue을 계속 확인하면서 거래 체결된게 있으면, 처리
  setInterval(async () => {
    if (queue.length === 0) return;
    while (queue.length === 0) {
      const task = queue.pop();
      await check_on_position_list(task.symbol);
      await check_limit_order_list(task.symbol);
    }
  }, 2000);

  sleep(4 * 1000);

  // 포지션, order를 주기적으로 계속 체크하는 부분
  setInterval(async () => {
    await check_on_position_list(task.symbol);
    await check_limit_order_list(task.symbol);
  }, 30 * 1000);
};

main();
