const crypto = require("crypto");
const SECRET = require("../SECRET.json");
const COINS = require("../COINS.json");
const { coin_info } = require("../globalState/index");

module.exports = {
  getSignature: (param) => {
    let orderedParams = "";
    Object.keys(param)
      .sort()
      .forEach((key) => {
        orderedParams += key + "=" + param[key] + "&";
      });

    orderedParams = orderedParams.substring(0, orderedParams.length - 1);

    return crypto
      .createHmac(
        "sha256",
        SECRET.mode == "live"
          ? SECRET.bybit.API_SECRET
          : SECRET.bybit_test.API_SECRET
      )
      .update(orderedParams)
      .digest("hex");
  },
  getPercentage: (current_price, market_price) => {
    const percentage = 1 - current_price / market_price;
    return percentage < 1 ? percentage * -1 : percentage - 1;
  },
  getTargetPrice: (symbol, current_price, position) => {
    const coinObj = coin_info.find((e) => e.symbol == symbol);
    if (!coinObj) return;
    const white_list = COINS.white_list.find((e) => e.symbol == symbol);
    const tick_size = coinObj.tick_size;

    let target_price = 0;

    // 만약 tick으로 설정했다면,
    if (white_list.percentage == 0) {
      if (position == 1) {
        target_price = current_price + tick_size * white_list.tick_size * 2;
      } else if (position == 2) {
        target_price = current_price + tick_size * white_list.tick_size;
      } else if (position == 3) {
        target_price = current_price - tick_size * white_list.tick_size;
      } else if (position == 4) {
        target_price = current_price - tick_size * white_list.tick_size * 2;
      }
    } else {
      // 만약 퍼샌테이지로 설정했다면,
      if (position == 1) {
        target_price =
          current_price + ((current_price * white_list.percentage) / 100) * 2;
      } else if (position == 2) {
        target_price =
          current_price + (current_price * white_list.percentage) / 100;
      } else if (position == 3) {
        target_price =
          current_price - (current_price * white_list.percentage) / 100;
      } else if (position == 4) {
        target_price =
          current_price - ((current_price * white_list.percentage) / 100) * 2;
      }
    }

    /**
     * 소수점 자르는 로직
     */
    let precision_num = 0;
    const stringed_number = tick_size.toString();
    if (stringed_number.split(".")[0].length != stringed_number.length) {
      precision_num = stringed_number.split(".")[1].length;
    }

    target_price = target_price - (target_price % tick_size);

    target_price = parseFloat(target_price.toFixed(precision_num));

    return target_price;
    /**
     * THE END ####
     */
  },
  checkNullish: (res) => {
    if (res == null || res == undefined) {
      console.log("##### err Null or undefined 발견");
      console.log(res);
      return true;
    } else {
      return false;
    }
  },
};
