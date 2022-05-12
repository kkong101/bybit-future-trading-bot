const puppeteer = require("puppeteer");
const TRADE = require("../TRADE.json");
const { trade } = require("../globalState/index");
const { postAxios } = require("../axios/index");
const { check_available_coin_trade } = require("../setInfo/index");
const { setBalance } = require("../trade/deposit");

module.exports = {
  setVix: async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://datavalue.dunamu.com/feargreedindex");
    setTimeout(async () => {
      await page.content().then((html) => {
        const index = html.indexOf((dy = '"38"'));
        let vixNum = parseFloat(html.substr(index + 5, 5));
        browser.close();
        if (isNaN(vixNum)) {
          console.log("VIX 가져오는데 에러가 발생하였습니다.(임시로 50 세팅)");
          vixNum = 50;
        }
        // parsing vix 파일
        TRADE.vix.forEach(async (e) => {
          const side_num = e.range.split("~");
          if (
            parseInt(side_num[0]) <= vixNum &&
            vixNum <= parseInt(side_num[1])
          ) {
            trade.leverage = e.leverage;
            trade.using_money_rate = e.using_money_rate;
            console.log("vixNum : ", vixNum);
            console.log("leverage : ", e.leverage);
            console.log("using_money_rate", e.using_money_rate);

            // 잔고 업데이트 부분.
            await setBalance();

            // 최소수량 못마추는 코인들 제거하기.
            check_available_coin_trade();
          }
        });
      });
    }, 400);

    setInterval(async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto("https://datavalue.dunamu.com/feargreedindex");
      setTimeout(async () => {
        await page.content().then((html) => {
          const index = html.indexOf((dy = '"38"'));
          let vixNum = parseFloat(html.substr(index + 5, 5));
          browser.close();
          if (isNaN(vixNum)) {
            console.log(
              "VIX 가져오는데 에러가 발생하였습니다.(임시로 50 세팅)"
            );
            vixNum = 50;
          }
          // parsing vix 파일
          TRADE.vix.forEach((e) => {
            const side_num = e.range.split("~");
            if (
              parseInt(side_num[0]) <= vixNum &&
              vixNum <= parseInt(side_num[1])
            ) {
              trade.leverage = e.leverage;
              trade.using_money_rate = e.using_money_rate;
              console.log("vixNum : ", vixNum);
              console.log("leverage : ", e.leverage);
              console.log("using_money_rate", e.using_money_rate);
            }
          });
        });
      }, 400);
    }, 1000 * 60);
  },
};
