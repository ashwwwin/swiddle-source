import { Router } from 'express'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const userModel = require('@/Models/user')
const feedbackModel = require('@/Models/feedback')
const signInLogModel = require('@/Models/signInLog')
const shareAccessModel = require('@/Models/shareAccess')
const furnitureList = require('@/Models/furniture')
const shopModel = require('@/Models/shop')
const eventsModel = require('@/Models/events')
const eventInviteResponsesModel = require('@/Models/eventInviteResponses')
const flatLedgerModel = require('@/Models/flatLedger')

const nodemailer = require('nodemailer')
const Email = require('email-templates')
const passwordHash = require('pbkdf2-password-hash')
const formidable = require('formidable');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const libmoji = require('libmoji')
const Web3 = require('web3')



//Controls whether new users are put in the waitlist
const waitlistEnabled = false

const transporter = nodemailer.createTransport({
  host: process.env.MAILER_HOST,
  post: process.env.MAILER_PORT,
  secure: true,
  auth: {
    user: process.env.MAILER_USERNAME,
    pass: process.env.MAILER_PASSWORD,
  }
})

const emailTemplate = new Email({
  transport: transporter,
  views: {
    options: {
      extension: 'ejs'
    }
  },
  message: {
    from: `Swiddle <${process.env.DEFAULT_FROM_EMAIL}>`,
  }
})

const gameList = {
  'who-is': {
    title: 'Who Is',
    desc: 'Anonymously vote on who is...',
    getCoin: false,
    minPlayers: 2
  },
  'doodly': {
    title: 'Doodly',
    desc: 'Take turns drawing and guessing, some art skill is required.',
    getCoin: true,
    minPlayers: 2
  },
  // 'uwo': {
  //   title: 'UWO',
  //   desc: 'Match cards with the same color or number, first to finish wins!'
  // },
  'humanity': {
    title: 'PB n J',
    desc: 'Fill in the blanks with the most hysterical phrase!',
    getCoin: true,
    minPlayers: 3
  },
  'love-hate': {
    title: 'Love or Not',
    desc: "Sometimes there's no in between, you either love it or you don't.",
    getCoin: false,
    minPlayers: 2
  },
  'guess-who': {
    title: 'Guess Who',
    desc: "A fun way to learn something surprising about each other.",
    getCoin: false,
    minPlayers: 3
  },
  'codename': {
    title: 'Codenames',
    desc: "Split into 2 teams and decypher the clues!",
    getCoin: true,
    minPlayers: 4
  },
  'lipoker': {
    title: 'LiPoker',
    desc: "Poker, made with ❤️ from our friends at LiPoker.io",
    getCoin: false,
    minPlayers: 2
  },
  'richup': {
    title: 'Richup',
    desc: "The best monopoly on the internet, period.",
    getCoin: false,
    minPlayers: 2
  },
  // 'air-hockey': {
  //   title: 'Air Hockey',
  //   desc: "",
  //   getCoin: false,
  //   minPlayers: 2
  // },
}

const furnitureTypes = ['tv', 'chair', 'table', 'window', 'deco', 'door']

const freeFurnitures = {
  woodpanel: 1,
  tv: 1,
  tvtable: 1,
  diningtable: 1,
  window: 1,
  bookcorner: 1,
  fireplace: 1,
  door: 1
}

const initialInventories = {
  "c3dd113cb416": {
    "name": "door",
    "x": 1494.6943722802703,
    "y": 21.663035247864233
  },
  "9ff979bcd8ee": {
    "name": "woodpanel",
    "x": 943.2391523391093,
    "y": 1.2256601318932148
  },
  "7eb8efa54c43": {
    "name": "window",
    "x": 176.158203125,
    "y": 0.00004575252533669157
  },
  "8af48d9af3d6": {
    "name": "fireplace",
    "x": -18.740234375,
    "y": 0.24985454082486172
  },
  "15939265efb7": {
    "name": "diningtable",
    "x": 456.0123697916667,
    "y": 416.0332488775253
  },
  "86fb469fc533": {
    "name": "tv",
    "x": 1006.9752604166666,
    "y": 22.488327002525338
  },
  "d5fb19dfcacb": {
    "name": "tvtable",
    "x": 993.232421875,
    "y": 184.90369158585867
  },
  "98abaa060e4d": {
    "name": "bookcorner",
    "x": 1812.5086334149044,
    "y": -0.9994944175084362
  }
}

const serverId = uuidv4()

function generate_libmoji(existing_avatar: any, comicId: string) {
  if (!existing_avatar || existing_avatar == "undefined") {
    return ''
  }
  const avatarId = libmoji.getAvatarUuid(String(existing_avatar))
  return libmoji.buildRenderUrl(comicId, avatarId, 1, 0.8, 0)
}

const isProd = process.env.NODE_ENV == 'production'

// Connect mongodb
const url = `${process.env.MONGODB_CONNECT_URL}`
mongoose.connect(url, {
  dbName: process.env.DB_NAME,
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  user: process.env.USER_NAME,
  pass: process.env.PASSWORD
})

const db = mongoose.connection
db.once('open', _ => {
  console.log('Database connected:', url)
})
db.on('error', err => {
  console.error('connection error:', err)
})

// Init router and path
const router = Router()



// Webflow pages
router.get('/', async function (req, res) {
  res.render('landing/index.pug', {
    title: 'Swiddle'
  })
  // const email = req.query.email
  // const token = req.query.token
  // if (email && token) {
  //   const user = await userModel.findOneAndUpdate({
  //     email,
  //     token,
  //   }, {
  //     emailActivated: true,
  //   })

  //   if (user) {
  //     // TODO: This will be removed
  //     if (!user.furnitureList) {
  //       user.furnitureList = freeFurnitures
  //       user.inventories = initialInventories
  //       user.save()
  //     }
  //     if (user.access) {
  //       if (!user.activatedAt) {
  //         user.activatedAt = new Date()
  //         user.save()
  //       }
  //       res.redirect(`/${user.address}`)
  //     } else {
  //       res.render('landing/index.pug', {
  //         title: 'Swiddle',
  //         siteUrl: process.env.SITE_URL,
  //         snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
  //         activated: true,
  //         isProd
  //       })
  //     }
  //   }
  // } else {
  //   res.render('landing/index.pug', {
  //     title: 'Swiddle',
  //     siteUrl: process.env.SITE_URL,
  //     snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
  //     activated: false,
  //     isProd
  //   })
  //   // mixpanel.track('Visits', {
  //   //   'page': 'home'
  //   // })
  // }
})

router.get('/sign-in', async function (req, res) {
  const email = req.query.email
  const token = req.query.token
  if (email && token) {
    const user = await userModel.findOneAndUpdate({
      email,
      token,
    }, {
      emailActivated: true,
    })

    if (user) {
      // TODO: This will be removed
      if (!user.furnitureList) {
        user.furnitureList = freeFurnitures
        user.inventories = initialInventories
        user.save()
      }
      if (user.access) {
        if (!user.activatedAt) {
          user.activatedAt = new Date()
          user.save()
        }
        res.redirect(`/${user.address}`)
      } else {
        res.render('landing/sign-in.pug', {
          title: 'Swiddle',
          siteUrl: process.env.SITE_URL,
          snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
          activated: true,
          isProd
        })
      }
    }
  } else {
    res.render('landing/sign-in.pug', {
      title: 'Swiddle',
      siteUrl: process.env.SITE_URL,
      snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
      activated: false,
      isProd
    })
  }
})

router.get('/sign-up', async function (req, res) {
  res.render('landing/sign-up.pug', {
    title: 'Swiddle'
  })
  // const email = req.query.email
  // const token = req.query.token
  // if (email && token) {
  //   const user = await userModel.findOneAndUpdate({
  //     email,
  //     token,
  //   }, {
  //     emailActivated: true,
  //   })

  //   if (user) {
  //     // TODO: This will be removed
  //     if (!user.furnitureList) {
  //       user.furnitureList = freeFurnitures
  //       user.inventories = initialInventories
  //       user.save()
  //     }
  //     if (user.access) {
  //       if (!user.activatedAt) {
  //         user.activatedAt = new Date()
  //         user.save()
  //       }
  //       res.redirect(`/${user.address}`)
  //     } else {
  //       res.render('landing/index.pug', {
  //         title: 'Swiddle',
  //         siteUrl: process.env.SITE_URL,
  //         snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
  //         activated: true,
  //         isProd
  //       })
  //     }
  //   }
  // } else {
  //   res.render('landing/index.pug', {
  //     title: 'Swiddle',
  //     siteUrl: process.env.SITE_URL,
  //     snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
  //     activated: false,
  //     isProd
  //   })
  //   // mixpanel.track('Visits', {
  //   //   'page': 'home'
  //   // })
  // }
})

router.get('/mint', async function (req, res) {
  res.render('landing/mint.pug', {
    title: 'Swiddle'
  })
})

router.get('/milestones', async function (req, res) {
  res.render('landing/milestones.pug', {
    title: 'Swiddle'
  })
})

router.get('/blog', async function (req, res) {
  res.render('landing/blog.pug', {
    title: 'Swiddle'
  })
})

router.get('/blog/introducing-swiddle', async function (req, res) {
  res.render('landing/blog-posts/introducing-swiddle.pug', {
    title: 'Swiddle'
  })
})

router.get('/blog/the-future', async function (req, res) {
  res.render('landing/blog-posts/the-future.pug', {
    title: 'Swiddle'
  })
})

router.get('/blog/original-flat-nfts', async function (req, res) {
  res.render('landing/blog-posts/original-flat-nfts.pug', {
    title: 'Swiddle'
  })
})





// /* GET simple login page. */
// router.get('/simple', async function (req, res) {
//   const email = req.query.email
//   const token = req.query.token
//   if (email && token) {
//     const user = await userModel.findOneAndUpdate({
//       email,
//       token,
//     }, {
//       emailActivated: true,
//     })

//     if (user) {
//       // TODO: This will be removed
//       if (!user.furnitureList) {
//         user.furnitureList = freeFurnitures
//         user.inventories = initialInventories
//         user.save()
//       }
//       if (user.access) {
//         if (!user.activatedAt) {
//           user.activatedAt = new Date()
//           user.save()
//         }
//         res.redirect(`/${user.address}`)
//       } else {
//         res.render('simple-login.pug', {
//           title: 'Swiddle',
//           siteUrl: process.env.SITE_URL,
//           snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
//           activated: true,
//           isProd
//         })
//       }
//     }
//   } else {
//     res.render('simple-login.pug', {
//       title: 'Swiddle',
//       siteUrl: process.env.SITE_URL,
//       snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
//       activated: false,
//       isProd
//     })
//     // mixpanel.track('Visits', {
//     //   'page': 'simple'
//     // })
//   }
// })

// /* GET privacy page. */
// router.get('/privacy', function (_req, res) {
//   res.render('privacy.pug', {
//     title: 'Swiddle'
//   })
// })

// /* GET terms page. */
// router.get('/terms', function (_req, res) {
//   res.render('terms.pug', {
//     title: 'Swiddle'
//   })
// })

/* Get reset password page */
router.get('/reset-password', async function (req, res) {
  const email = req.query.email
  const token = req.query.token
  if (email && token) {
    const user = await userModel.findOne({
      email,
      token,
    })

    if (user) {
      if (user.token == null) {
        return
      }
      res.render('reset-password.pug', {
        title: 'Swiddle',
        name: user.name,
        email,
        token
      })
      return
    }
  }

  res.redirect('/')
})

router.get('/inventory-box', function (req, res) {
  res.render('inventory-box.pug', {
    furnitureList,
    furnitureTypes
  })
})

router.get('/furniture-shop', function (req, res) {
  //Removes items that aren't visible from the furniture shop
  // Object.keys(furnitureList).forEach(function(key) {
  //   if (furnitureList[key].visible == false) {
  //     delete furnitureList[key]
  //   }
  // })
  
  res.render('furniture-shop.pug', {
    furnitureList,
    furnitureTypes
  })
})

/* Get download page */
router.get('/download', async function (req, res) {
  res.render('download.ejs')
})

//User would access this page when they update their invitation decision T33
router.get('/event-invite', async function (req, res) {
  //Gets variables
  const decision = req.query.decision
  const token = req.query.token

  //If token and decision variables are received then
  if (token != null && decision != null) {
    //Check that the token exists
    const invite = await eventInviteResponsesModel.findOne({
      token: token
    })

    //If the event invite is valid (existing token)
    if (invite) {
      //Updates the decision (whether user is coming or not)
      invite.coming = decision
      invite.save()

      res.render('event-invite-decision.pug', {
        title: 'Swiddle',
        decision,
        token
      })
    }
      return
  }

  res.redirect('/')
})



router.post('/reset-password', async function (req, res) {
  const email = req.query.email
  const token = req.query.token
  if (email && token) {
    const user = await userModel.findOne({
      email,
      token,
    })

    if (user) {
      //Encrypts the users password
      user.password = await passwordHash.hash(req.body.password)
      //Clears the password reset token, so it's single use only
      user.token = uuidv4()

      //Saves new password & cleared token
      user.save()

      res.json({
        success: true,
        user
      })
      return
    }
  }
  res.json({
    success: false
  })
})

/* Auto login */
router.post('/auto-login', async function (req, res) {
  const user = await userModel.findOne({
    token: req.body.token,
    email: new RegExp(`^${req.body.email}$`, 'i'),
  })
  if (user) {
    // TODO: This will be removed
    if (!user.furnitureList) {
      user.furnitureList = freeFurnitures
      user.inventories = initialInventories
    }

    if (!user.roomImage) {
      user.roomImage = 'roomIcon.png'
    }

    user.token = uuidv4()

    res.json({
      success: true,
      user: user
    })

    const currentTime = new Date()
    if (user.access && !user.activatedAt) {
      user.activatedAt = currentTime
    }
    user.userLastActive = currentTime
    user.timeZone = req.body.timeZone
    user.save()
    
    if (user.access || user.invitedBy) {
      // mixpanel.track('Login', {
      //   'email': user.email,
      //   'username': user.name
      // })
    }
  } else {
    res.json({
      success: false,
    })
  }
})

/* Auto login */
router.post('/metamask-login', async function (req, res) {
  var user = await userModel.findOne({
    ethAddress: req.body.ethId,
  }) 

  console.log(user)

  //If no Ethereum address is found, create an account
  if (!user) {
    var user = await new userModel({
      name: req.body.ethId,
      ethAddress: req.body.ethId,
      token: uuidv4(),
      coins: 500,
      access: true,
      furnitureList: freeFurnitures,
      inventories: initialInventories,
      timeZone: req.body.timeZone
    })

    user.address = user._id
    user.save()
  }
    
  //Checks if the user owns any flats
  var flatsOwned = await flatLedgerModel.find({ flatOwner: { $regex : new RegExp(req.body.ethId, "i") } } )
    
  res.json({
    success: true,
    user: user,
    flatsOwned: flatsOwned
  })
})



router.post('/login', async function (req, res) {
  const user = await userModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i'),
  })

  if (user) {
    // TODO: This will be removed
    if (!user.furnitureList) {
      user.furnitureList = freeFurnitures
      user.inventories = initialInventories
      user.save()
    }
    if (!user.token) {
      user.token = uuidv4()
      user.save()
    }
    const check = await passwordHash.compare(req.body.password, user.password)
    if (check) {
      res.json({
        success: true,
        user: user
      })
      const currentTime = new Date()
      if (user.access && !user.activatedAt) {
        user.activatedAt = currentTime
      }
      user.userLastActive = currentTime
      user.save()

      const log = new signInLogModel({
        userId: user.id,
        date: currentTime
      })
      log.save()
    } else {
      res.json({
        success: false,
        fail_password: true
      })
    }
    return
  }

  res.json({
    success: false,
    fail_email: true
  })
})

/* Set address */
router.post('/set-address', async function (req, res) {
  let result = false
  const address = req.body.address

  //Checks if the address is taken
  const addressExist = await userModel.findOne({
    address: new RegExp(`^${address}$`, 'i'),
  })

  //If the address is not taken then update it
  if (!addressExist) {
    const user = await userModel.findOneAndUpdate({
      _id: req.body.id,
    }, {
      address: address,
    }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    })
    if (user.guideState != 'finish') {
      user.guideState = 'birthday'
      user.save()
    }
    result = true
  }
  res.json(result)
})

/* Set birthday */
router.post('/set-birthday', async function (req, res) {
  const user = await userModel.findOneAndUpdate({
    _id: req.body.id,
  }, {
    birthday: req.body.birthday,
  })

  if (user.guideState == 'birthday') {
    user.guideState = 'finish'
  }
  user.save()
  res.json(true)
})

/* GET play screen */
router.get('/:address', async function (req, res) {
  const owner = await userModel.findOne({
    address: new RegExp(`^${req.params.address}$`, 'i')
  }, {
    _id: 1,
    name: 1,
    sleepAvatar: 1,
    welcomeAvatar: 1,
    bunnyAvatar: 1,
    shareAccessCount: 1,
    roomName: 1,
    roomDesc: 1,
    maxUsers: 1,
    lockedRoom: 1,
  })

  // If the address is not found redirect the user
  if (!owner) {
    res.redirect('/sign-in')
    return
  }

  if (!owner.maxUsers) {
    owner.maxUsers = 10
    owner.save()
  }

  const data = {
    title: 'Swiddle',
    siteUrl: process.env.SITE_URL,
    roomId: encodeURIComponent(req.params.address).toLowerCase(),
    isProd,
    snapkitClientId: process.env.SNAPKIT_CLIENT_ID,
    gameList,
    owner,
    intercomAppId: process.env.INTERCOM_APP_ID,
    furnitureList,
    serverId
  }

  res.render('play.pug', data)

})

/* Feedback */
router.post('/feedback', async function (req, res) {
  const feedback = req.body.feedback
  const userId = req.body.userId
  const record = new feedbackModel({
    feedback,
    userId,
    date: new Date(),
  })
  await record.save()
  res.json('success')
})

// /* Check email if it's exist */
// router.post('/check-email', async function (req, res) {
//   const user = await userModel.findOne({
//     email: new RegExp(`^${req.body.email}$`, 'i'),
//   })


//   //This is a big security flaw, I can get all user data with just an email

//   res.json({
//     user
//   })
// })

router.post('/check-password', async function (req, res) {
  const user = await userModel.findOne({
    _id: req.body.id,
  })

  if (!user.token) {
    const token = uuidv4()
    user.token = token
  }

  if (user.coins === undefined) {
    user.coins = 500
  }


  if (user.access === undefined && waitlistEnabled == false) {
    user.access = true
  }

  if (user.roomName === undefined) {
    var firstName = (user.name).split(" ", 1)
    user.roomName = (firstName) + "'s home"
  }

  user.save()

  const result = await passwordHash.compare(req.body.password, user.password)
  res.json({
    success: result,
    user: user
  })
})

router.post('/sign-up', async function (req, res) {
  const exist = await userModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i'),
  })

  if (exist) {
    res.json({
      exist: true
    })
    return
  }

  //Check if user has been sent access by another user
  const access = await shareAccessModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i')
  })


  //If user has been invited then give them coins as the reward
  if (access.userId){
    const inviter = await userModel.findOne({
      _id: access.userId
    })

    //Give coins to the user that invited them
    if (inviter != null){
      inviter.coins += 500
      await inviter.save()
    }

  }

  const user = new userModel({
    email: (req.body.email).toLowerCase(),
    password: await passwordHash.hash(req.body.password),
    invitedBy: (access ? access.userId : ''),
    token: uuidv4(),
    furnitureList: freeFurnitures,
    inventories: initialInventories,
    timeZone: req.body.timeZone
  })
  await user.save()

  user.address = user._id
  user.coins = 500
  if (waitlistEnabled == false) {
    user.access = true
  }
  await user.save()

  res.json(user)
})

router.post('/new-sign-up', async function (req, res) {
  const exist = await userModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i'),
  })

  if (exist) {
    res.json({
      exist: true
    })
    return
  }

  // const bitmoji = req.body.avatar || ''
  // const avatar = generate_libmoji(bitmoji, '10214650')
  // const welcomeAvatar = generate_libmoji(bitmoji, '10214354')
  // const bunnyAvatar = generate_libmoji(bitmoji, '20018934')
  // const sleepAvatar = generate_libmoji(bitmoji, '20045113')

  const access = await shareAccessModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i')
  })

  //If user has been invited then give them coins as the reward
  if (access?.userId){
    const inviter = await userModel.findOne({
      _id: access.userId
    })

    //Give coins to the user that invited them
    if (inviter != null) {
      inviter.coins += 500
      await inviter.save()
    }
  }

  const user = new userModel({
    name: req.body.name,
    email: (req.body.email).toLowerCase(),
    // avatar,
    // welcomeAvatar,
    // bunnyAvatar,
    // sleepAvatar,
    password: await passwordHash.hash(req.body.password),
    invitedBy: (access ? access.userId : ''),
    token: uuidv4(),
    furnitureList: freeFurnitures,
    inventories: initialInventories,
    timeZone: req.body.timeZone
  })
  await user.save()

  user.address = user._id
  user.coins = 500
  if (waitlistEnabled == false) {
    user.access = true
  }
  await user.save()

  if (user && !user.emailActivated) {
    // mixpanel.track('Registration', {
    //   'email': user.email,
    //   'username': user.name,
    //   'access': user.access,
    //   'avatarType': 'default'
    // })
    // //Only call alias once
    // mixpanel.alias(user.email);
    await emailTemplate.send({
      template: 'activate',
      message: {
        to: user.email,
      },
      locals: {
        NAME: req.body.name,
        LINK: `${process.env.SITE_URL}${req.body.path}?email=${user.email}&token=${user.token}`
      }
    })
  }

  res.json(user)
})

router.post('/finish-signup', async function (req, res) {
  const exist = await userModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i'),
  })

  if (exist) {
    res.json({
      exist: true
    })
    return
  }

  const bitmoji = req.body.avatar || ''
  const avatar = generate_libmoji(bitmoji, '10214650')
  const welcomeAvatar = generate_libmoji(bitmoji, '10214354')
  const bunnyAvatar = generate_libmoji(bitmoji, '20018934')
  const sleepAvatar = generate_libmoji(bitmoji, '20045113')

  const access = await shareAccessModel.findOne({
    email: new RegExp(`^${req.body.email}$`, 'i')
  })

  //If user has been invited then give them coins as the reward
  if (access?.userId){
    const inviter = await userModel.findOne({
      _id: access.userId
    })

    //Give coins to the user that invited them
    if (inviter != null) {
      inviter.coins += 500
      await inviter.save()
    }
  }

  const user = new userModel({
    name: req.body.name,
    email: (req.body.email).toLowerCase(),
    avatar,
    welcomeAvatar,
    bunnyAvatar,
    sleepAvatar,
    password: await passwordHash.hash(req.body.password),
    invitedBy: (access ? access.userId : ''),
    token: uuidv4(),
    furnitureList: freeFurnitures,
    inventories: initialInventories,
    timeZone: req.body.timeZone
  })
  await user.save()

  user.address = user._id
  user.coins = 500
  if (waitlistEnabled == false) {
    user.access = true
  }
  await user.save()

  if (user && !user.emailActivated) {
    // mixpanel.track('Registration', {
    //   'email': user.email,
    //   'username': user.name,
    //   'access': user.access,
    //   'avatarType': 'default'
    // })
    await emailTemplate.send({
      template: 'activate',
      message: {
        to: user.email,
      },
      locals: {
        NAME: req.body.name,
        LINK: `${process.env.SITE_URL}${req.body.path}?email=${user.email}&token=${user.token}`
      }
    })
  }
  res.json(user)
})

router.post('/share-access', async function (req, res) {
  const user = await userModel.findOne({
    _id: req.body.id
  })
  if (user && user.shareAccessCount > 0) {
    const friend = await userModel.findOne({
      email: new RegExp(`^${req.body.email}$`, 'i')
    })
    if (friend && (friend.invitedBy || friend.access)) {
      res.json({
        success: false,
        msg: `${friend.name} already has access`
      })
      return
    }

    const shareAccessEmail = await shareAccessModel.findOne({
      email: new RegExp(`^${req.body.email}$`, 'i')
    })

    //Checks if the user has been previously invited
    if (shareAccessEmail) {
      res.json({
        success: false,
        msg: `${shareAccessEmail.email} has already been invited`
      })
      return
    }

    const access = new shareAccessModel({
      userId: req.body.id,
      email: req.body.email.toLowerCase()
    })
    access.save()
    await userModel.findOneAndUpdate({
      email: new RegExp(`^${req.body.email}$`, 'i')
    }, {
      invitedBy: req.body.id,
      activatedAt: new Date(),
    })
    user.shareAccessCount -= 1
    user.accessSentCount += 1
    user.save()
    await emailTemplate.send({
      template: 'shared-access',
      message: {
        to: req.body.email,
      },
      locals: {
        NAME: friend?.name,
        INVITED_BY_NAME: user.name,
        LINK: process.env.SITE_URL
      }
    })
    res.json({
      success: true,
      count: user.shareAccessCount
    })
    // mixpanel.track('Sharing access', {
    //   'email': user.email,
    //   'inviteSentTo': req.body.email,
    //   'invitesLeft': user.shareAccessCount
    // })
  }
  res.json({
    success: false,
    msg: "No invites left"
  })
})

router.post('/get-access-count', async function (req, res) {
  const user = await userModel.findOne({
    _id: req.body.id
  })
  res.json(user.shareAccessCount)
})

router.post('/forgot-password', async function (req, res) {
  const user = await userModel.findOne({
    email: req.body.email
  })
  if (user) {
    const token = uuidv4()
    user.token = token
    user.save()

    await emailTemplate.send({
      template: 'forgot-password',
      message: {
        to: user.email,
      },
      locals: {
        NAME: user.name,
        LINK: `${process.env.SITE_URL}/reset-password?email=${user.email}&token=${user.token}`
      }
    })

    res.json({
      success: true
    })
    return
  }
  res.json({
    success: false
  })
})

router.post('/get-bitmoji', function (req, res) {
  const avatar = generate_libmoji(req.body.avatar || '', '10214650')

  res.json({
    avatar
  })
})

router.post('/update-bitmoji', async function (req, res) {
  const bitmoji = req.body.avatar || ''
  const avatar = generate_libmoji(bitmoji, '10214650')
  const welcomeAvatar = generate_libmoji(bitmoji, '10214354')
  const bunnyAvatar = generate_libmoji(bitmoji, '20018934')
  const sleepAvatar = generate_libmoji(bitmoji, '20045113')

  await userModel.findOneAndUpdate({
    _id: req.body.id
  }, {
    // name: req.body.name,
    avatar,
    welcomeAvatar,
    bunnyAvatar,
    sleepAvatar,
  })

  res.json({
    success: true
  })
})

//When user is offline and receives a message
router.post('/msg-email', async function (req, res) {
  const receiver = await userModel.findOne({
    _id: req.body.receiverId
  })

  //Checks user email preference is not false
  if (receiver.msgEmailNotify != false){

    const sender = await userModel.findOne({
      _id: req.body.senderId
    })

    // mixpanel.track('Message Email Notification', {
    //   'sender': sender.email,
    //   'receiver': receiver.name
    // })

    await emailTemplate.send({
      template: 'msg-notify-offline',
      message: {
        to: receiver.email,
      },
      locals: {
        RECEIVER_NAME: receiver.name,
        SENDER_NAME: sender.name,
        LINK: process.env.SITE_URL
      }
    })
  }
})

router.post('/user-settings-profile-save', async function (req, res) {
  await userModel.findOneAndUpdate({
    _id: req.body.id
  }, {
    name: req.body.name,
    bio: req.body.bio
  })

  res.json({
    success: true
  })
})



router.post('/create-event', async function (req, res) {
  //Storing invites
  var currentInvites = req.body.eventInvites
  currentInvites.push(req.body.eventCreator)

  //Creates the event
  var newEvent = await eventsModel.create({ 
    eventName: req.body.eventName, 
    eventTimeTZ: req.body.eventTimeTZ, 
    eventTime: req.body.eventTime, 
    invites: currentInvites, 
    eventCreator: req.body.eventCreator})

  //Getting the event creator's info
  var eventCreator = await userModel.findOne({ _id: mongoose.Types.ObjectId(req.body.eventCreator) })

  //Creates invites & their status for each user
  //Initializing variables
  var counter = 0
  var playerNames = []
  var playerEmails = []
  var playerTokens = []
  var playerTimezones = []
  var friendNamesString = ''
  //The loop that gets it done
  while (counter < currentInvites.length) {
    //Storing the player id and a new token
    var playerId = currentInvites[counter]
    var currentToken = uuidv4()

    //If the current player is not the event creator (the creator will obvs be coming)
    if (playerId != req.body.eventCreator) {
      //Creates the invite connection
      await eventInviteResponsesModel.create({
        eventId: newEvent._id,
        userId: playerId,
        token: currentToken,
      })

      //Sends them the invite via email, asking them if they can come or not
      var playerInfo = await userModel.findOne({_id: mongoose.Types.ObjectId(playerId)})
      playerNames.push(playerInfo.name)
      playerEmails.push(playerInfo.email)
      playerTokens.push(currentToken)
      playerTimezones.push(playerInfo.timeZone)

      //Just a string of all the friends that are going to be there
      friendNamesString = friendNamesString + playerInfo.name + ', ' 

    } else if (playerId == req.body.eventCreator) {
      //Creates the invite for the event creator (since they don't need to be emailed)
      await eventInviteResponsesModel.create({
        eventId: newEvent._id,
        userId: playerId,
        token: currentToken,
        coming: true,
      })
    }
    counter += 1
  }

  //Removing the last comma from the friend names string
  friendNamesString = friendNamesString.replace(/,(\s+)?$/, '')
  //And then replacing the 2nd last comma with an ' and '
  friendNamesString = friendNamesString.replace(/,(?=[^,]*$)/, ' and ')


  //Getting the event date
  var prettyDate = ((req.body.eventTime).split(' ')[1]) + ' ' + (req.body.eventTime).split(' ')[2] + ', ' + (req.body.eventTime).split(' ')[3]
  

  //Getting the event time
  var prettyTime;

  counter = 0
  //Sends users the invite via email, asking them if they can come or not
  while (counter < playerNames.length) {
    var currentName = playerNames[counter]
    var currentEmail = playerEmails[counter]
    var currentToken = playerTokens[counter]
    var currentTimezone = playerTimezones[counter]

    //Sends the email invite
    await emailTemplate.send({
      template: 'event-invite',
      message: {
        to: currentEmail,
      },
      locals: {
        NAME: currentName,
        FRIENDS: friendNamesString,
        CREATOR: eventCreator.name,
        EVENT: req.body.eventName,
        TIME: prettyTime,
        ZONE: prettyDate,
        LINK_TRUE:  `${process.env.SITE_URL}/event-invite?token=${currentToken}&decision=true`,
        LINK_FALSE:  `${process.env.SITE_URL}/event-invite?token=${currentToken}&decision=false`
      }
    })
    counter += 1
  }

  // mixpanel.track('Event Creation', {
  //   'email': eventCreator.email,
  //   'event_creator': eventCreator._id,
  //   'event_id': newEvent._id,
  // })

  res.json({
    success: true
  })
})



router.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body
  
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1400,
    currency: "usd"
  })

  res.send({
    clientSecret: paymentIntent.client_secret
  })
});



//This uploads the room image
router.post("/my-room-image-upload", async (req, res) => {
  var form = new formidable.IncomingForm()
  const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

  await form.parse(req, async function (err: any, fields: any, files: any) {
    if (!validImageTypes.includes(files.fileName.type)) {
      return
    } else if (files.fileName.size/1024/1024 > 1) {
      return
    } else {
      var newName = uuidv4() + '.' + (files.fileName.type).split('/')[1]
      var oldpath = files.fileName.path
      var newpath = process.env.ROOM_IMAGE_URL + newName

      await fs.rename(oldpath, newpath, function (err: any) {
        if (err) {
          console.log(err)
        } else {
          res.json({
            success: true,
            data: newName
          })
        }
      })
    }
  })
})

router.post("/my-room-image-upload-success", async (req, res) => {
  const ownId = req.body.ownId
  const fileName = req.body.fileName
  const token = req.body.token

  var ownUser = await userModel.findOne({ 
    _id: mongoose.Types.ObjectId(ownId),
     token: token })

  if (ownUser) {
    ownUser.roomImage = fileName
    ownUser.save()
    console.log(ownUser)

    res.json({
      success: true,
    })
  }
})

// Export the base-router
export default router



// Event Notification System
var eventRunner = false
function checkEventStatus () {
  //Checks if there is already an instance running, this assures only one instance is running at a time
  if (eventRunner == false) {
    eventRunner = true
    //Gets the current time
    var currentTime = new Date()

    //Gets the time plus 15 mins
    var timePlus15Mins = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      currentTime.getHours(),
      currentTime.getMinutes() + 15,
      0
    )

    //Checks for invites every minute
    setTimeout(async function () {
      //Finding events happening in the next 15 mins
      var eventsNow = await eventsModel.find({
        eventTime: { "$gte": currentTime, "$lt": timePlus15Mins}, 
        participantsNotified: false
      })

      //If there are any events in the next 15 minutes then run
      if (eventsNow) {
        //A loop for the events happening in the next 15 mins
        var counter = 0
        while (counter < eventsNow.length) {
          //Storing the current event
          var currentEvent = eventsNow[counter]

          //Getting the name, creator of the current event
          var eventName = currentEvent.eventName
          var eventCreator = currentEvent.eventCreator

          var eventCreatorInfo = await userModel.findOne({ _id: mongoose.Types.ObjectId(eventCreator) })

          //A loop to store all names, emails associated with this email
          //Initializing variables for the loop
          var userInInviteCounter = 0
          var playerNames = []
          var playerIds = []
          var playerEmails = []
          var friendNamesString = ''
          //The loop lol
          while (userInInviteCounter < (currentEvent.invites).length) {
            //Getting player id from the invites array
            var playerId = currentEvent.invites[userInInviteCounter]
            var playerInfo = await userModel.find({ _id: mongoose.Types.ObjectId(playerId) })

            playerInfo = playerInfo[0]
            //Storing user email, name
            playerNames.push(playerInfo.name)
            playerEmails.push(playerInfo.email)
            playerIds.push(playerInfo._id)

            //Just a string of all the friends that are going to be there
            friendNamesString = friendNamesString + playerInfo.name + ', ' 

            
            userInInviteCounter += 1
          }

          //Removing the last comma from the friend names string
          friendNamesString = friendNamesString.replace(/,(\s+)?$/, '')
          //And then replacing the 2nd last comma with an ' and '
          friendNamesString = friendNamesString.replace(/,(?=[^,]*$)/, ' and ')

          var playerCounter = 0
          while (playerCounter < playerNames.length) {
            var currentName = playerNames[playerCounter]
            var currentEmail = playerEmails[playerCounter]
            var currentId = playerIds[playerCounter]

            //Checking if the user is coming
            var emailResponse = await eventInviteResponsesModel.findOne({
              eventId: currentEvent._id,
              userId: currentId
            })

            //Sends the if they have responded that they are coming or if the invite has not been responded to
            if (emailResponse.coming != false){
              await emailTemplate.send({
                template: 'event-starting-soon',
                message: {
                  to: currentEmail
                },
                locals: {
                  NAME: currentName,
                  FRIENDS: friendNamesString,
                  CREATOR: eventCreatorInfo.name,
                  EVENT: eventName,
                }
              })
            }


            playerCounter += 1
          }

          //Updates the events, confirms that the participants have been notified
          currentEvent.participantsNotified = true
          currentEvent.save()
          counter += 1
        }
      }

      //Resets the instance checker & re-runs the function
      eventRunner = false
      checkEventStatus()
    }, 30000)
  }
}

checkEventStatus();




//Keeps track of NFT Ownership
//Checks if the contract has been initialized
const web3 = new Web3(process.env.WEB3_NETWORK)
var abi: any

//Initializes the nft contract
var OGFlat = fs.readFileSync(process.env.NFT_PATH)
abi = JSON.parse(OGFlat).abi
var nft_contract = new web3.eth.Contract(abi)
nft_contract.options.address = process.env.NFT_ADDRESS
// console.log(nft_contract)

//Initializes the factory contract
var OGFlatFactory = fs.readFileSync(process.env.FACTORY_PATH)
abi = JSON.parse(OGFlatFactory).abi
var factory_contract = new web3.eth.Contract(abi)
factory_contract.options.address = process.env.FACTORY_ADDRESS
// console.log(factory_contract)

// Flat NFT Owner Ledger
var flatLedgerRunner = false
async function updateFlatLedger () {

  //Checks if there is already an instance running, this assures only one instance is running at a time
  if (flatLedgerRunner == false) {
    //Gets the total supply
    var nftSupply = await factory_contract.methods.getSupply().call()

    for (var counter = 1; counter <= nftSupply; counter++) {
      //Gets the owner of the current NFT through the tokenId
      var nftOwner = await nft_contract.methods.ownerOf(counter).call()

      console.log(`[${counter}] ${nftOwner}`)

      //Updates the database
      await flatLedgerModel.findOneAndUpdate({
        tokenId: counter
      }, {
        flatOwner: nftOwner
      },
      {
        upsert: true
      })
    }

    flatLedgerRunner = false
  }

  //Schedules it to run again in 55 minutes
  setTimeout(updateFlatLedger, 3300000)
}
    
updateFlatLedger()