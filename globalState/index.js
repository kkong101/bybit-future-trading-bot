module.exports = {
  trade: {
    total_money: 10000.0,
    leverage: 1,
    using_money_rate: 0.5,
    is_circuit_breaker: false,
    is_onPosition: false,
    is_onCreate_order: false,
    position_direction: "both",
  },
  coin_info: [],
  /**
   * {
      symbol: 'BTCUSDT',
      tick_size: '0.5',
      min_price: '0.5',
      min_trading_qty: 0.001,
      qty_step: 0.001
      order_id: [cd9a24c, cd9a24c, cd9a24c]
      update_time: 153049039404
      previous_price: 0,
      current_price: 0,
    }
   */

  /**
   * 이렇게 변경 
   * order: [
        {
          id: "fnewejnf",
          position: 1
        },
        {
          id: "fnewejnf",
          position: 2
        },
        {
          id: "fnewejnf",
          position: 3
        }
   * ]
   */

  on_position_coin_list: [],
  create_order_queue: [],
  /**
   *   on_position_coin_list.push({
                symbol: symbol,
                order_id: order.order_id,
                side: order.side,
              });
   */
  circuit_breaker: {
    btc_price: 0,
    signal_start_time: null,
  },
};
