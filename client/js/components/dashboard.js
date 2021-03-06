var React = require('react');
var cookie = require('cookie');
var dollarString = require('dollar-string');
var Router = require('react-router');
var Actions = require('../actions/actions');
var Store = require('../stores/store');
var refreshRate = 30000;

var RouteHandler = Router.RouteHandler;
var Link = Router.Link;

var Authentication = {
  statics: {
    willTransitionTo: function (event) {
      if (!Store.isUserLoggedIn()) {
        event.redirect('login');
      }
    }
  }
};

var Dashboard = React.createClass({

  mixins: [Router.Navigation, Router.State, Authentication],

  getInitialState: function () {
    if (Store.isUserLoggedIn()) {
      Actions.getDashboardInfo();
      setTimeout(function () {
        this.getInitialState();
      }.bind(this), refreshRate);
    }
    return Store.getUserData();
  },

  componentWillMount: function () {
    Store.addChangeListener(this._onChange);
  },

  componentWillUnmount: function () {
    Store.removeChangeListener(this._onChange);
  },

  _onChange: function () {
    this.setState(Store.getUserData());
  },

  toggleMenu: function () {
    if (document.getElementById('dash-menu-items').className === '') {
      document.getElementById('dash-menu-items').className = 'open-menu';
    } else {
      document.getElementById('dash-menu-items').className = '';
    }

    if (document.getElementById('dash-content').className === '') {
      document.getElementById('dash-content').className = 'open-menu';
    } else {
      document.getElementById('dash-content').className = '';
      document.getElementById('dash-content').removeEventListener('click', this.toggleMenu);
    }
  },

  hamburgerHelper: function () {
    document.getElementById('dash-menu-items').addEventListener('click', this.toggleMenu);
    document.getElementById('dash-content').addEventListener('click', this.toggleMenu);
    this.toggleMenu();
  },

  handleLinkClick: function () {
    console.log('click');
    document.getElementById('dash-menu-items').className = '';
  },

  menuItems: [
    { route: 'emails', text: 'Emails'},
    { route: 'VIP', text: 'VIP List' },
    { route: 'account', text: 'Account Settings' },
    { route: 'payments', text: 'Payment Settings' },
    { route: 'logout', text: 'Log Out'}
  ],

  render: function () {
    var username = cookie.parse(document.cookie).username;
    var balance = 'Balance: ' + dollarString.fromCents(this.state.userSettings.balance);
    return (
      <div>

        <div className="dash-menu">

          <div className="menu-head">
            <h1>Gilded</h1>
            <span className="hamburger" onClick={this.hamburgerHelper}></span>
          </div>

          <ul id="dash-menu-items">
          {this.menuItems.map(function (item, i) {
            return (
              <li key={i}>
                <Link to={item.route} onClick={this.handleLinkClick}>{item.text}</Link>
              </li>
              );
          })}
          </ul>

        </div>

        <div className="logged-in-user">
          <span className="user-at-gilded">{username}@gilded.club</span><span className="down-arrow">&#9662;</span>
          <span className="user-balance">{balance}</span>
        </div>

        <div id="dash-content">
          <RouteHandler escrow={this.state.userEmails} settings={this.state.userSettings} vips={this.state.userVIPs} card={this.state.userCard} />
        </div>

      </div>
      );
  }

});

module.exports = Dashboard;
