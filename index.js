require('console-stamp')(console, 'HH:MM:ss')
const Discordie = require('discordie')
const client = new Discordie()
const triviaAnswers = require('./trivia.json')
const CONFIG = require('./config.json')

let myUsername
let listenChannel = null
let running = false

function createInterval(cmd, time, delay, offset) {
  function i() {
    if (!running || !listenChannel) return

    console.log(`Sending '${cmd}'`)
    listenChannel.sendMessage(cmd)
    setTimeout(i, time + (Math.random() * 2 - 1) * delay)
  }
  
  setTimeout(i, offset)  // Run the interval once
}

client.connect({ token: CONFIG.TOKEN })

client.Dispatcher.on('GATEWAY_READY', () => {
  let { username, discriminator } = client.User
  myUsername = username

  console.log(`Logged in to Discord as ${username}#${discriminator}`)
  console.log('-----------------------------' + '-'.repeat(username.length))
})

client.Dispatcher.on('MESSAGE_CREATE', e => {
  const { author, content, channel, embeds } = e.message

  //  Don't handle messages in different channels  and   only process messages by me or the bot
  if ((listenChannel && channel !== listenChannel) || !(['Dank Memer', myUsername].includes(author.username))) {
    return
  }

  // Find command to handle the message
  switch (true) {
    // Start
    case /^\$s(tart)?$/i.test(content): {
      console.log('Starting bot')

      listenChannel = channel
      running = true

      if (CONFIG.USE_DAILY)  createInterval('pls daily',  1000 * 60 * 60 * 24,     500, 0)
      if (CONFIG.USE_WEEKLY) createInterval('pls weekly', 1000 * 60 * 60 * 24 * 7, 500, 0)

      if (CONFIG.DEPOSIT)    createInterval('pls deposit all', 1000 * 41, 100, 2000)

      if (CONFIG.USE_FISH)   createInterval('pls fish',     1000 * 41, 100, 6000)
      if (CONFIG.USE_SEARCH) createInterval('pls search',   1000 * 41, 100, 15000)
      if (CONFIG.USE_TRIVIA) createInterval('pls trivia',   1000 * 41, 100, 24000)
      if (CONFIG.USE_BEG)    createInterval('pls beg',      1000 * 41, 100, 33000)

      if (CONFIG.USE_MEMES)  createInterval('pls postmeme', 1000 * 82, 100, 40000)

      break
    }

    // Stop
    case /^\$stop$/i.test(content): {
      console.log('Stopping bot')

      running = false
      listenChannel = null
      break
    }

    // Clear
    case /^\$c(lear)?$/i.test(content): {
      if (listenChannel) listenChannel.sendMessage('`' + '\n'.repeat(50) + '`')
      break
    }

    // Search
    case /in chat\.\n`(.+?)`/.test(content): {
      const places = content
        .split('\n')[1]
        .replace(/`/g, '')
        .split(',')
        .filter(item => !CONFIG.SEARCH_AVOID_PLACES.includes(item.trim()))

      // TODO: Sort places based on the amount of money you win
      // reddit.com/r/dankmemer/comments/fur9k2/sharing_my_stats_on_pls_search
      
      console.log(` ↳ Searching '${places[0] || 'NOWHERE - I DONT WANT TO DIE'}'`)
      listenChannel.sendMessage(places[0] || 'NOWHERE - I DONT WANT TO DIE')

      break
    }

    // Trivia
    case embeds[0] && embeds[0].author && embeds[0].author.name && embeds[0].author.name.indexOf('trivia') !== -1: {
      const { description, author } = embeds[0]
      const question = description.match(/\*\*(.+?)\*\*/)[1]
      const user = author.name.match(/(.+?)'s trivia question/)[1]

      if (question && user === myUsername) {
        const responses = description.match(/[ABCD]\) \*(.+?)\*/g)

        if (Math.random() < (1 - CONFIG.TRIVIA_CORRECT_CHANCE)) {
          console.log(' ↳ Answering trivia randomly')
          listenChannel.sendMessage('abcd'[4 * Math.random() | 0])
        } else {
          console.log(' ↳ Answering trivia correctly')
          const correctAnswer = triviaAnswers.find(e => e.question === question).correct_answer

          listenChannel.sendMessage(responses.find(el => el.indexOf(correctAnswer) > -1)[0].toLowerCase())
        }

        break
      }
    }

    // Post meme
    case /type of meme/i.test(content): {
      listenChannel.sendMessage('d')

      break
    }

    // Sell received items
    case /(?:brought back|at least you found|sent you|, and) (?:(\d+)|a) (?:<:\w+:\d+> )?(?::\w+: )?(?:\*\*)?([\w\s]+)/i.test(content): {
      if (!CONFIG.SELL_ITEMS) break

      const [_, amount = 1, name] = content.match(/(?:brought back|at least you found|sent you|, and) (?:(\d+)|a) (?:<:\w+:\d+> )?(?::\w+: )?(?:\*\*)?([\w\s]+)/i)
      
      //TODO: Add whitelist for items to sell
      const id = CONFIG.ITEM_IDS[name.toLowerCase().trim()]

      console.log(` ↳ Selling ${amount} ${id || name}`)
      listenChannel.sendMessage(`pls sell ${id || name} ${amount}`)

      break
    }

    // Type given text (events and prevent fishing rod from breaking)
    case /Typ(?:e|ing) `(.+?)`/i.test(content): {
      const [_, text] = content.match(/Typ(?:e|ing) `(.+?)`/i)

      console.log(` ↳ Typing '${text}'`)
      listenChannel.sendTyping()
      setTimeout(() => listenChannel.sendMessage(text), 100 + 40 * text.length)

      break
    }

    // Any other message
    default: {
      // console.log(`Message '${content}' ignored`)
    }
  }
})
