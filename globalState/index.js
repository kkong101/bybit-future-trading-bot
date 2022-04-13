module.exports = {
  trade: {
    total_money: 10000.0,
    leverage: 1,
    using_money_rate: 0,
    is_circuit_breaker: false,
    is_onPosition: false,
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
    }
   */
  on_position_coin_list: [],
  circuit_breaker: {
    btc_price: 0,
    checked_time: Date.now(),
    signal_start_time: null,
    end_circuit_breaker_time: null,
  },
};
