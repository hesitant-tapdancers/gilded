var domain = process.env.DOMAIN;
var BPromise = require('bluebird');
var User = require('./userModel.js');
var dispatcher = 'jenkins@' + domain;
var bcrypt = require('bcrypt-nodejs');
var stripe = require('stripe')(process.env.STRIPE);

var tokenGen = function (username, expiration) {
  return new BPromise(function (resolve, reject) {
    bcrypt.hash(process.env.SECRET + username + expiration, null, null, function (error, hash) {
      if (error) {
        reject(error);
      } else {
        resolve(hash);
      }
    });
  });
};

module.exports = {
  join: function (req, res, next) {
    var userData = {
      username: req.body.username.toLowerCase(),
      forwardEmail: req.body.forwardEmail
    };
    bcrypt.hash(req.body.password, null, null, function (error, hash) {
      if (error) {
        console.log(error);
        res.status(409).send(error);
      } else {
        userData.password = hash;
        User.create(userData, function (error, user) {
          if (error) {
            console.log(error);
            res.status(409).send(error);
          } else {
            req.user = user.toJSON();
            next();
          }
        });
      }
    });
  },

  login: function (req, res, next) {
    User.findOne({username: req.body.username.toLowerCase()}, function (error, user) {
      if (error) {
        console.log(error);
      } else if (!user) {
        console.log('user does not exist');
        res.sendStatus(404);
      } else {
        bcrypt.compare(req.body.password, user.password, function (error, response) {
          if (error) {
            console.log(error);
          } else if (response === false) {
            res.status(422).send('wrong password');
          } else {
            req.user = user.toJSON();
            next();
          }
        });
      }
    });
  },

  getUser: function (req, res, next) {
    User.findOne({username: req.cookies.username}, function (error, user) {
      if (error) {
        console.log(error);
        res.status(400).send(error);
      } else {
        req.user = user.toJSON();
        next();
      }
    });
  },

  sendConfirmation: function (req, res) {
    res.status(201).send(req.user.toJSON());
  },

  logout: function (req, res) {
    res.clearCookie('userExpires');
    res.clearCookie('userToken');
    res.status(201).send('logged out');
  },

  storeSession: function (req, res, next) {
    var expiration = Date.now() + (1000 * 60 * 60 * 24 * 30);
    tokenGen(req.body.username.toLowerCase(), expiration)
      .then(function (token) {
        res.cookie('username', req.body.username.toLowerCase());
        res.cookie('userExpires', expiration);
        res.cookie('userToken', token);
        next();
      })
      .catch(function (error) {
        console.log(error);
      });
  },

  checkSession: function (req, res, next) {
    var checkToken = process.env.SECRET + req.cookies.username + req.cookies.userExpires;
    bcrypt.compare(checkToken, req.cookies.userToken, function (error, result) {
      if (error) {
        console.log('Compare error: ', error);
        res.redirect('/login');
      } else if (!result) {
        res.redirect('/login');
      } else {
        if (req.cookies.userExpiration < Date.now()) {
          res.redirect('/login');
        } else {
          next();
        }
      }
    });
  },

  changePassword: function (req, res) {
    bcrypt.hash(req.body.password, null, null, function (error, hash) {
      if (error) {
        console.log(error);
        res.status(400).send(error);
      } else {
        User.findOneAndUpdate({username: req.cookies.username}, {password: hash}, function (error, user) {
          if (error) {
            console.log(error);
            res.status(400).send(error);
          } else {
            res.status(201).send(user.toJSON());
          }
        });
      }
    });
  },

  updateForwardEmail: function (req, res) {
    User.findOneAndUpdate({username: req.cookies.username}, {forwardEmail: req.body.forwardEmail}, function (error, user) {
      if (error) {
        console.log(error);
        res.status(400).send(error);
      } else {
        res.status(201).send(user.toJSON());
      }
    });
  },

  changeRate: function (req, res) {
    User.findOneAndUpdate({username: req.cookies.username}, {rate: req.body.rate}, function (error, user) {
      if (error) {
        console.log(error);
        res.status(400).send(error);
      } else {
        res.status(201).send(user.toJSON());
      }
    });
  },

  addVip: function (req, res) {
    User.findOneAndUpdate({username: req.cookies.username}, {$push: {vipList: {$each: req.body.add}}}, function (error, user) {
      if (error) {
        console.log(error);
        res.sendStatus(409);
      } else {
        res.status(201).send(user.toJSON());
      }
    });
  },

  removeVip: function (req, res) {
    User.findOneAndUpdate({username: req.cookies.username}, {$pullAll: {vipList: req.body.remove}}, function (error, user) {
      if (error) {
        console.log(error);
        res.sendStatus(409);
      } else {
        res.status(201).send(user.toJSON());
      }
    });
  },

  isVip: function (username, sender) {
    return new BPromise(function (resolve, reject) {
      User.findOne({username: username}, function (error, user) {
        if (error) {
          reject(error);
        } else if (!user) {
          reject('Looking for a user that does not exist');
        } else {
          if ((sender === dispatcher) || (user.vipList.indexOf(sender) >= 0)) {
            resolve(user.forwardEmail);
          } else {
            resolve(null);
          }
        }
      });
    });
  },

  getRate: function (username) {
    return new BPromise(function (resolve, reject) {
      User.findOne({username: username}, function (error, user) {
        if (error) {
          reject(error);
        } else if (!user) {
          reject('Looking for a user that does not exist');
        } else {
          resolve(user.rate);
        }
      });
    });
  },

  addCard: function (req, res) {
    var last4 = req.body.card.cardNumber.slice(-4);
    var card = {
      number: req.body.card.cardNumber,
      exp_month: req.body.card.expMonth,
      exp_year: req.body.card.expYear,
      cvc: req.body.card.cvc,
      name: req.body.card.cardHolderName
    };

    User.findOne({username: req.cookies.username}, function (error, user) {
      if (error) {
        console.log('User not found: ', error);
        res.status(400).send(error);
      } else {
        var newCardEmail = {
          to: user.forwardEmail,
          from: 'hello@gilded.club',
          subject: 'New Card Added',
          html: '<h1>New Card Added</h1>A card was recently added to your gilded.club account for receiving payments. If you believe this to be error, please email <a href="mailto:admin@gilded.club">admin@gilded.club</a> immediately.',
          text: 'A card was recently added to your gilded.club account for receiving payments. If you believe this to be an error, please email admin@gilded.club immediately.'
        };

        if (user.stripeId) {
          stripe.recipients.update(user.stripeId, {card: card}, function (error) {
            if (error) {
              console.log('Error updating card: ', error);
              res.status(400).send(error);
            } else {
              User.update({username: req.cookies.username}, {last4: last4}, function (error, updateUser) {
                if (error) {
                  console.log('Error updating user record: ', error);
                  res.status(400).send(error);
                } else {
                  require('../email/emailController.js').sendEmail(newCardEmail);
                  res.status(201).send(updateUser);
                }
              });
            }
          });
        } else {
          stripe.recipients.create({
            name: req.body.card.cardHolderName,
            email: user.forwardEmail,
            type: 'individual',
            description: 'New gilded.club user'
          }, function (error, recipient) {
            if (error) {
              console.log('Error creating recipient: ', error);
              res.status(400).send(error);
            } else {
              stripe.recipients.createCard(recipient.id, {card: card}, function (error) {
                if (error) {
                  console.log('Error adding card: ', error);
                  res.status(400).send(error);
                } else {
                  User.update({username: req.cookies.username}, {last4: last4, stripeId: recipient.id}, function (error, updateUser) {
                    if (error) {
                      console.log('Error updating user record: ', error);
                      res.status(400).send(error);
                    } else {
                      require('../email/emailController.js').sendEmail(newCardEmail);
                      res.status(201).send(updateUser);
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  },

  withdraw: function (req, res) {
    User.findOne({username: req.cookies.username}, function (error, user) {
      if (error) {
        console.log('User does not exist: ', error);
        res.status(400).send(error);
      }
      if (user.balance === 0) {
        res.status(200).send(user);
      }
      stripe.transfers.create({
        amount: user.balance,
        currency: 'usd',
        recipient: user.stripeId,
        description: 'Gilded.club balance'
      }, function (error) {
        if (error) {
          console.log(error);
          res.status(400).send(error);
        } else {
          User.findOneAndUpdate({_id: user.id}, {balance: 0}, function (error, updatedUser) {
            if (error) {
              console.log(error);
              res.status(400).send(error);
            } else {
              res.status(201).send(updatedUser.toJSON());
            }
          });
        }
      });
    });
  }
};
