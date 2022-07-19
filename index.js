/**
 * 자동 매매 봇을 시작시키는 부분
 */

const { getSecretInfo, sleep } = require("./utils/index");
const { get_coin_info } = require("./coinInfo/index");
const { detectContractedPosition } = require("./subscribe/order");
const { setCurrentPrice } = require("./subscribe/price");
const {
  queue,
  on_position_coin_list,
  coin_info,
} = require("./globalState/index");
const { check_close_position, check_modify_order } = require("./check");
const {
  check_on_position_list,
  check_limit_order_list,
} = require("./trade/check");
const { setBBInfo } = require("./indicator/index");
const { white_list } = require("./COINS.json");
const TEST = require("./globalState/index");
const { create_one_position } = require("./trade/order");
const { setBalance } = require("./trade/deposit");
const { trade } = require("./globalState/index");

const main = async () => {
  const updateSecretObj = getSecretInfo(true);
  const secretObj = getSecretInfo(false);

  await setBalance();

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
  setInterval(async () => {
    const newMin = new Date().getMinutes();
    if (newMin == prevMin) return;
    sleep(1000);
    for (const coin of white_list) {
      await setBBInfo(coin.symbol);
      await check_modify_order(coin.symbol);
    }
    prevMin = newMin;
  }, 1000);

  // limit_order 변경해주는곳
  // setInterval(async () => {
  //   for (const coin of white_list) {
  //     await check_modify_order(coin.symbol);
  //   }
  // }, 12 * 1000);

  // queue을 계속 확인하면서 거래 체결된게 있으면, 처리
  setInterval(async () => {
    for (const coin of coin_info) {
      await check_close_position(coin.symbol);
    }

    if (queue.length === 0) return;
    while (queue.length === 0) {
      const task = queue.pop();
      await check_on_position_list(task.symbol);
      await check_limit_order_list(task.symbol);
    }
  }, 1000);

  sleep(4 * 1000);

  // 포지션, order를 주기적으로 계속 체크하는 부분
  setInterval(async () => {
    await setBalance();
    for (const coin of white_list) {
      await check_on_position_list(coin.symbol);
      await check_limit_order_list(coin.symbol);
      // 로그 출력
      console.log("trade.total_money =>", trade.total_money);
      console.log("onPositionList =>", on_position_coin_list);
      console.log("coin_info =>", coin_info);
      console.log("coin_info.order =>", coin_info[0].order);
      // 로그 출력
    }
  }, 20 * 1000);
};

main();
