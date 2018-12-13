/*
	RSI Bull and Bear + ADX modifier
	1. Use different RSI-strategies depending on a longer trend
	2. But modify this slighly if shorter BULL/BEAR is detected
	-
	(CC-BY-SA 4.0) Tommie Hansen
	https://creativecommons.org/licenses/by-sa/4.0/
	-
	NOTE: Requires custom indicators found here:
	https://github.com/Gab0/Gekko-extra-indicators
	(c) Gabriel Araujo
	Howto: Download + add to gekko/strategies/indicators
*/

// req's
const log = require('../core/log.js');
const config = require('../core/util.js').getConfig();
const store = config.currentIndicatorValues;
const CandleBatcher = require('../core/candleBatcher');
const RSI = require('../strategies/indicators/RSI.js');
const SMA = require('../strategies/indicators/SMA.js');
const ADX = require('../strategies/indicators/ADX.js');

var maSlow = new SMA(config.RSI_BULL_BEAR_ADX_TF.SMA.long);
var maFast = new SMA(config.RSI_BULL_BEAR_ADX_TF.SMA.short);

var BULL_RSI = new RSI({interval: config.RSI_BULL_BEAR_ADX_TF.BULL.rsi});
var BEAR_RSI = new RSI({interval: config.RSI_BULL_BEAR_ADX_TF.BEAR.rsi});

var myADX = new ADX(config.RSI_BULL_BEAR_ADX_TF.ADX.adx);

var rsi, adx, advised = false, counter = 0;
var countdownForCheckIn = 288; // 288 - 5 Minute candles = 1 day

// strategy
var strat = {
	
	/* INIT */
	init: function()
	{
		// core
		this.name = 'RSI Bull and Bear + ADX';
		this.requiredHistory = config.tradingAdvisor.historySize;
		this.resetTrend();
		
		// debug? set to false to disable all logging/messages/stats (improves performance in backtests)
		this.debug = false;
		
		// performance
		config.backtest.batchSize = 1000; // increase performance
		// config.silent = true; // NOTE: You may want to set this to 'false' @ live
		// config.debug = false;
		
		// SMA
		// this.addIndicator('maSlow', 'SMA', this.settings.SMA.long );
		// this.addIndicator('maFast', 'SMA', this.settings.SMA.short );
		
		// RSI
		// this.addIndicator('BULL_RSI', 'RSI', { interval: this.settings.BULL.rsi });
		// this.addIndicator('BEAR_RSI', 'RSI', { interval: this.settings.BEAR.rsi });
		
		// ADX
		//this.addIndicator('ADX', 'ADX', this.settings.ADX.adx );
		
		// MOD (RSI modifiers)
		this.BULL_MOD_high = config.RSI_BULL_BEAR_ADX_TF.BULL.mod_high;
		this.BULL_MOD_low = config.RSI_BULL_BEAR_ADX_TF.BULL.mod_low;
		this.BEAR_MOD_high = config.RSI_BULL_BEAR_ADX_TF.BEAR.mod_high;
		this.BEAR_MOD_low = config.RSI_BULL_BEAR_ADX_TF.BEAR.mod_low;
		
		// Create batcher - Put in candle size here
		this.batcher = new CandleBatcher(5);

		// Supply callback when batcher is full
		this.batcher.on('candle', this.updateBatcher);

		
		// debug stuff
		this.startTime = new Date();
		
		// add min/max if debug
		if( this.debug ){
			this.stat = {
				adx: { min: 1000, max: 0 },
				bear: { min: 1000, max: 0 },
				bull: { min: 1000, max: 0 }
			};
		}
		
		// /* MESSAGES */
		
		// message the user about required history
		log.info("====================================");
		log.info('Running', this.name);
		log.info('====================================');
		log.info("Make sure your warmup period matches SMA_long and that Gekko downloads data if needed");
		
		// warn users
		if( this.requiredHistory < config.RSI_BULL_BEAR_ADX_TF.SMA.long )
		{
			log.warn("*** WARNING *** Your Warmup period is lower then SMA_long. If Gekko does not download data automatically when running LIVE the strategy will default to BEAR-mode until it has enough data.");
		}
		
	}, // init()
	
	
	/* RESET TREND */
	resetTrend: function()
	{
		var trend = {
			duration: 0,
			direction: 'none',
			longPos: false,
		};
	
		this.trend = trend;
	},
	
	
	/* get low/high for backtest-period */
	lowHigh: function( val, type )
	{
		let cur;
		if( type == 'bear' ) {
			cur = this.stat.bear;
			if( val < cur.min ) this.stat.bear.min = val; // set new
			else if( val > cur.max ) this.stat.bear.max = val;
		}
		else if( type == 'bull' ) {
			cur = this.stat.bull;
			if( val < cur.min ) this.stat.bull.min = val; // set new
			else if( val > cur.max ) this.stat.bull.max = val;
		}
		else {
			cur = this.stat.adx;
			if( val < cur.min ) this.stat.adx.min = val; // set new
			else if( val > cur.max ) this.stat.adx.max = val;
		}
	},
	
	update: function(candle){
		if (counter <= this.requiredHistory) counter++;

		this.batcher.write([candle]);
		this.batcher.flush();

	},

	updateBatcher: function(candle){
		maSlow.update(candle.close);
		maFast.update(candle.close);
		BULL_RSI.update(candle);
		BEAR_RSI.update(candle);
		myADX.update(candle);
	},
	
	/* CHECK */
	check: function(candle)
	{
		// get all indicators
		let ind = this.indicators;

			adx = myADX.result;

		countdownForCheckIn--;

		if(countdownForCheckIn == 0){
			log.remote('Bot Check in\n\nBot ran w/o issue for last 24 hours.');
			countdownForCheckIn = 288;
		}
			
		// BEAR TREND
		// NOTE: maFast will always be under maSlow if maSlow can't be calculated
		if( maFast.result < maSlow.result )
		{
			rsi = BEAR_RSI.result;
			let rsi_hi = this.settings.BEAR.high,
				rsi_low = this.settings.BEAR.low;
			
			// ADX trend strength?
			if( adx > this.settings.ADX.high ) rsi_hi = rsi_hi + this.BEAR_MOD_high;
			else if( adx < this.settings.ADX.low ) rsi_low = rsi_low + this.BEAR_MOD_low;
				
			if( rsi > rsi_hi && advised){
				var message = 'Selling During Bear Trend\n\nFast SMA: ' +
				maFast.result + '\nSlow SMA: ' + maSlow.result +
				'\n\nSlow SMA above Fast SMA, indicating bear trend. \n\nCurrent RSI is ' +
				rsi + ' , which is higher than the bear RSI high of ' +
				this.settings.BEAR.high + '\n\nBuy Price: ' + store.buyPrice + 
				'\nSell Price: ' + candle.close;
				log.remote(message);
				this.short();
				advised = false;
			}
			else if( rsi < rsi_low && !advised) {
				var message = 'Buying During Bear Trend\n\nFast SMA: ' +
				maFast.result + '\nSlow SMA: ' + maSlow.result +
				'\n\nSlow SMA above Fast SMA, indicating bear trend. \n\nCurrent RSI is ' +
				rsi + ' , which is lower than the bear RSI low of ' +
				this.settings.BEAR.low + '\n\nBuy Price: ' + candle.close;
				store.buyPrice = candle.close;
				log.remote(message);
				this.long();
				advised = true;
			}
			
			if(this.debug) this.lowHigh( rsi, 'bear' );
		}

		// BULL TREND
		else
		{
			rsi = BULL_RSI.result;
			let rsi_hi = this.settings.BULL.high,
				rsi_low = this.settings.BULL.low;
			
			// ADX trend strength?
			if( adx > this.settings.ADX.high ) rsi_hi = rsi_hi + this.BULL_MOD_high;		
			else if( adx < this.settings.ADX.low ) rsi_low = rsi_low + this.BULL_MOD_low;
				
			if( rsi > rsi_hi && advised) {
				var message = 'Selling During Bull Trend\n\nFast SMA: ' +
				maFast.result + '\nSlow SMA: ' + maSlow.result +
				'\n\nSlow SMA below Fast SMA, indicating bull trend. \n\nCurrent RSI is ' +
				rsi + ' , which is higher than the bull RSI high of ' +
				this.settings.BULL.high + '\n\nBuy Price: ' + store.buyPrice + 
				'\nSell Price: ' + candle.close;
				log.remote(message);
				this.short();
				advised = false;
			}
			else if( rsi < rsi_low && !advised)  {
				var message = 'Buying During Bull Trend\n\nFast SMA: ' +
				maFast.result + '\nSlow SMA: ' + maSlow.result +
				'\n\nSlow SMA below Fast SMA, indicating bull trend. \n\nCurrent RSI is ' +
				rsi + ' , which is lower than the bull RSI low of ' +
				this.settings.BULL.low + '\n\nBuy Price: ' + candle.close;
				log.remote(message);
				store.buyPrice = candle.close;
				this.long();
				advised = true;
			}
			if(this.debug) this.lowHigh( rsi, 'bull' );
		}
		
		// add adx low/high if debug
		if( this.debug ) this.lowHigh( adx, 'adx');
	
	}, // check()

	onCommand: function(cmd){
        var command = cmd.command;
        if (command == 'start') {
            cmd.handled = true;
            cmd.response = "Hi. I'm Gekko. Ready to accept commands. Type /help if you want to know more.";
        }
        if (command == 'status') {
            cmd.handled = true;
            log.info(maFast.result, maSlow.result, rsi);
            //log.info(counter, this.requiredHistory);
            if (counter > this.requiredHistory) { // need to take this out or add counter
                if (maFast.result < maSlow.result) {
                    if (advised)
                    cmd.response = "We're currently in a bear trend. Bear RSI = " + rsi + "\nWill sell when RSI > " + this.settings.BEAR.high;
                    else cmd.response = "We're currently in a bear trend. Bear RSI = " + rsi + "\nWill buy when RSI < " + this.settings.BEAR.low;
                } else {
                    if (advised)
                    cmd.response = "We're currently in a bull trend. Bull RSI = " + rsi + "\nWill sell when RSI > " + this.settings.BULL.high;
                    else cmd.response = "We're currently in a bull trend. Bull RSI = " + rsi + "\nWill buy when RSI < " + this.settings.BULL.low;
                }
            } else {
				cmd.response = "I need " + this.requiredHistory + 
				" candles of historical data to generate the SMA and RSI indicators. I currently have " +
				counter + " candles of historical data.";
            }
        }
		if (command == 'help') {
		  cmd.handled = true;
          cmd.response = "Supported commands: \n\n /buy - buy at next candle" + 
          "\n /sell - sell at next candle " + 
          "\n /rsi_bull_high [number] (w/o brackets) - set RSI Bull High to a specific number" + 
          "\n /rsi_bull_low [number] (w/o brackets) - set RSI Bull Low to a specific number" +
          "\n /rsi_bear_high [number] (w/o brackets) - set RSI Bear High to a specific number" +
          "\n /rsi_bear_low [number] (w/o brackets) - set RSI Bear low to a specific number";
        }
        if (command == 'settings') {
            cmd.handled = true;
            cmd.response = "Here are the current settings: \n\n" +
            "RSI Bull High = " + this.settings.BULL.high +
            "\nRSI Bull Low = " + this.settings.BULL.low +
            "\nRSI Bear High = " + this.settings.BEAR.high +
            "\nRSI Bear Low = " + this.settings.BEAR.low +
            "\n\n Use /help to learn how to change settings"
        }
        if (command == 'rsi_bull_high') {
            cmd.handled = true;
            config.RSI_BULL_BEAR_ADX.BULL.high = cmd.arguments;
            cmd.response = 'Setting RSI Bull High to ' + cmd.arguments;
        }
        if (command == 'rsi_bull_low') {
            cmd.handled = true;
            config.RSI_BULL_BEAR_ADX.BULL.low = cmd.arguments;
            cmd.response = 'Setting RSI Bull Low to ' + cmd.arguments;
        }
        if (command == 'rsi_bear_high') {
            cmd.handled = true;
            config.RSI_BULL_BEAR_ADX.BEAR.high = cmd.arguments;
            cmd.response = 'Setting RSI Bear High to ' + cmd.arguments;
        }
        if (command == 'rsi_bear_low') {
            cmd.handled = true;
            config.RSI_BULL_BEAR_ADX.BEAR.low = cmd.arguments;
            cmd.response = 'Setting RSI Bear Low to ' + cmd.arguments;
        }
		if (command == 'error'){
		  cmd.handled = true;
		  //cmd.response = "This will generate an error message, let's see if message is shown in Telegram";
		  log.remote('Can you see this error message in telegram?');
		}
		if (command == 'buy') {
		  cmd.handled = true;
		  this.advice('long');
		}
		if (command == 'sell') {
		  cmd.handled = true;
		  this.advice('short');
		}
    },
	
	
	/* LONG */
	long: function()
	{
		if( this.trend.direction !== 'up' ) // new trend? (only act on new trends)
		{
			this.resetTrend();
			this.trend.direction = 'up';
			this.advice('long');
			if( this.debug ) log.info('Going long');
		}
		
		if( this.debug )
		{
			this.trend.duration++;
			log.info('Long since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* SHORT */
	short: function()
	{
		// new trend? (else do things)
		if( this.trend.direction !== 'down' )
		{
			this.resetTrend();
			this.trend.direction = 'down';
			this.advice('short');
			if( this.debug ) log.info('Going short');
		}
		
		if( this.debug )
		{
			this.trend.duration++;
			log.info('Short since', this.trend.duration, 'candle(s)');
		}
	},
	
	
	/* END backtest */
	end: function()
	{
		let seconds = ((new Date()- this.startTime)/1000),
			minutes = seconds/60,
			str;
			
		minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';
		
		log.info('====================================');
		log.info('Finished in ' + str);
		log.info('====================================');
	
		// print stats and messages if debug
		if(this.debug)
		{
			let stat = this.stat;
			log.info('BEAR RSI low/high: ' + stat.bear.min + ' / ' + stat.bear.max);
			log.info('BULL RSI low/high: ' + stat.bull.min + ' / ' + stat.bull.max);
			log.info('ADX min/max: ' + stat.adx.min + ' / ' + stat.adx.max);
		}
		
	}
	
};

module.exports = strat;