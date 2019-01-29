# RSI_BULL_BEAR_ADX-Remote-Control-with-Telegram

<a href="http://www.youtube.com/watch?feature=player_embedded&v=OGKeYdbYNic
" target="_blank"><img src="http://img.youtube.com/vi/OGKeYdbYNic/0.jpg" 
alt="IMAGE ALT TEXT HERE" width="240" height="180" border="10" /></a>

This modified version will let you remotely control when Gekko will buy and sell and also let you modify the RSI settings so you can make changes to your strategy live. (Works with Gekko 0.6x)

1. Replace log.js in gekko/core folder.
2. Replace telegrambot.js in the gekko/plugins folder.
3. Replace plugins.js and subscriptions.js in the gekko folder.
4. Replace baseTradingMethod.js and tradingAdvisor.js in the gekko/plugins/tradingAdvisor folder.
5. Open Telegram, start a chat session with BotFather, create a bot and get a token. Put the token and bot name in the config-papertrader-telegram.js file. Put this file in the Gekko folder.
6. Install the ADX indicator needed for RSI_Bull_Bear_ADX (from Gab0).
7. Copy the RSI_BULL_BEAR_ADX.js file to the strategies folder.
8. Install TGFancy (Telegram Fancy) (ex: npm i tgfancy) at the Gekko folder.
9. Run the bot (ex: node gekko --config config-papertrader-telegram.js).
