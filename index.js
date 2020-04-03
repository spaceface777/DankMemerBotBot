require('console-stamp')(console, 'HH:MM:ss')
const Discordie = require('discordie')
const client = new Discordie()
const triviaAnswers = require('./trivia.json')
const CONFIG = require('./config.json')

let myUsername
let listenChannel = null
let running = false

function createInterval(cmd, time, delay) {
  function i() {
    if (!running) return

    console.log(`Sending '${cmd}'`)
    listenChannel.sendMessage(cmd)
    setTimeout(i, time + (Math.random() * 2 - 1) * delay)
  }
  i() // Run the interval once
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
      // Only start if it's this account that sent the start command
      if (author.username !== myUsername) {
        break
      }

      listenChannel = e.message.channel
      running = true

      if (CONFIG.USE_DAILY)  createInterval('pls daily', 1000 * 60 * 60 * 24, 500)
      if (CONFIG.USE_WEEKLY) createInterval('pls weekly', 1000 * 60 * 60 * 24 * 7, 500)

      if (CONFIG.DEPOSIT)    createInterval('pls deposit all', 1000 * 62, 500)

      if (CONFIG.USE_BEG)    setTimeout(() => createInterval('pls beg', 1000 * 31, 100), 3000)  // Start offsetted to prevent overlaps
      if (CONFIG.USE_FISH)   setTimeout(() => createInterval('pls fish', 1000 * 31, 100), 8000)
      if (CONFIG.USE_SEARCH) setTimeout(() => createInterval('pls search', 1000 * 31, 100), 13000)
      if (CONFIG.USE_TRIVIA) setTimeout(() => createInterval('pls trivia', 1000 * 31, 100), 18000)

      if (CONFIG.USE_MEMES)  setTimeout(() => createInterval('pls postmeme', 1000 * 62, 100), 30000)
      if (CONFIG.USE_MEMES)  setTimeout(() => createInterval('d', 1000 * 62, 100), 31000) // Dank meme
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

    // Sell beg items
    case /, and a .+ \*\*(.+)\*\*/.test(content): {
      if (!CONFIG.SELL_ITEMS) break

      const [_, name] = content.match(/, and a .+ \*\*(.+)\*\*/)

      console.log(` ↳ Selling 1 ${name}`)
      listenChannel.sendMessage(`pls sell ${name} 1`)

      break
    }

    // Sell fish and search items
    case /(?:brought back|you found) (\d+) (?:<:\w+:\d+> )?(?:\*\*)?([\w\s]+)/.test(content): {
      if (!CONFIG.SELL_ITEMS) break

      const [_, amount, name] = content.match(/(?:brought back|you found) (\d+) (?:<:\w+:\d+> )?(?:\*\*)?([\w\s]+)/)
      const id = CONFIG.ITEM_IDS[name.trim().toLowerCase()]

      console.log(` ↳ Selling ${amount} ${id || name}`)
      listenChannel.sendMessage(`pls sell ${id || name} ${amount}`)

      break
    }

    // Type to prevent fishing rod from breaking
    case /next 5 seconds\nType (.+?)/i.test(content): {
      const [_, text] = content.match(/\nType `(.+?)`/)

      console.log(` ↳ Typing '${text}' to prevent fishing rod from breaking`)
      listenChannel.sendMessage(text)

      break
    }

    // Any other message
    default: {
      // console.log(`Message '${content}' ignored`)
    }
  }
})
