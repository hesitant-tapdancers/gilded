var Promise = require('bluebird');
var User = require('./userModel.js');
var domain = process.env.DOMAIN;
var dispatcher = 'jenkins@' + domain;
var bcrypt = require('bcrypt-nodejs');

var tokenGen = function (username, expiration) {
  return new Promise(function (resolve, reject) {
    bcrypt.hash(process.env.SECRET + username + expiration, null, null, function (error, hash) {
      if (error) {
        reject(error);
      } else {
        resolve(hash);
      }
    });
  });
};

var storeSession = function (username) {
  var expiration = Date.now() + (100 * 60 * 62 * 24 * 30);
  return new Promise(function (resolve, reject) {
    tokenGen(username, expiration)
      .then(function (token) {
        resolve({username: username, userExpires: expiration, userToken: token});
      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });
  });
};


module.exports = {
  join: function (req, res) {
    var userData = {
      username: req.body.username,
      forwardEmail: req.body.forwardEmail
    };

    bcrypt.hash(req.body.password, null, null, function (error, hash) {
      if (error) {
        console.log(error);
        res.sendStatus(409);
      } else {
        userData.password = hash;
        User.create(userData, function (error, user) {
          if (error) {
            console.log(error);
            res.status(409).send(error);
          } else {
            storeSession(user.username)
              .then(function (cookie) {
                res.cookie(cookie);
                res.status(201).send(user);
              })
              .catch(function (error) {
                console.log(error);
                res.sendStatus(409);
              });
          }
        });
      }
    });
  },

  login: function (req, res) {
    User.findOne({username: req.body.username}, function (error, user) {
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
            storeSession(user.username)
              .then(function (cookie) {
                res.cookie(cookie);
                res.status(201).send(user);
              })
              .catch(function (error) {
                console.log(error);
                res.sendStatus(409);
              });
          }
        });
      }
    });
  },

  checkSession: function (req, res, next) {
    bcrypt.compare(process.env.SECRET + req.cookies.username + req.cookies.userExpiration, req.cookies.userToken, function (error, result) {
      if (error) {
        res.redirect('/login');
      } else {
        if (req.cookies.userExpiration >= Date.now()) {
          next();
        } else {
          res.redirect('/login');
        }
      }
    });
  },

  editVip: function (req, res) {
    User.findOneAndUpdate({_id: req.params.userId}, {$push: {vipList: {$each: req.body.add}}}, function (error, user) {
      if (error) {
        console.log(error);
        res.sendStatus(409);
      } else {
        User.findOneAndUpdate({_id: user._id}, {$pullAll: {vipList: req.body.remove}}, function (error, user) {
          if (error) {
            console.log(error);
            res.sendStatus(409);
          } else {
            res.status(201).send(user);
          }
        });
      }
    });
  },

  isVip: function (username, sender) {
    return new Promise(function (resolve, reject) {
      User.findOne({username: username}, function (error, user) {
        if (error) {
          reject(error);
        } else if (!user) {
          reject('Looking for a user that does not exist');
        } else {
          if ((sender === dispatcher) || (user.vipList.indexOf(sender) >= 0)) {
            resolve(user.forwardEmail); // TODO: change to forwardAddress
          } else {
            resolve(null);
          }
        }
      });
    });
  },

  getRate: function (username) {
    return new Promise(function (resolve, reject) {
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
  }
};
