var React = require('react');
var mui = require('material-ui');
var TextField = mui.TextField;
var RaisedButton = mui.RaisedButton;
var Paper = mui.Paper;
var StoreWatchMixin = require('../mixins/StoreWatchMixin');
var Store = require('../stores/store');

var Actions = require('../actions/actions');

var getInitialState = function () {
  var currentVIPs = Store.getUserVIPs();
  return {
    currentVIPs: currentVIPs,
    add: [],
    remove: []
  };
};

var VIProw = React.createClass({
  removeVIPsHandler: function () {
    contactToRemove = this.props.email.toString();
    Actions.removeVIPs([this.props.email]);
  },

  render: function () {
    return (
      <tr>
        <td className="vip-remove-box">
          <button className="vip-remove" onClick={this.removeVIPsHandler}>
          &times;
          </button>
        </td>
        <td className="vip-emails">
          {this.props.email}
        </td>
      </tr>
    );
  }
});

var VIPtable = React.createClass({
  render: function () {
    return (
      <table className="vip-table">
        <tbody>
        {this.props.data.map(function (email) {
          return (
            <VIProw email={email} />
            )
        })}
        </tbody>
      </table>
    );
  }
});

var VIP = React.createClass({

  mixins: [StoreWatchMixin(getInitialState)],

  addVipHandler: function (e) {
    e.preventDefault();
    this.state.add.push(this.refs.email.getValue());
    this.refs.email.setValue('');
    Actions.updateVips(this.state);
  },

  render: function() {
    var numberOfVIPsMessage = this.props.vips.length > 0 ? "You have " + this.props.vips.length + " contacts in your VIP list." : "Your VIP list is empty."

    return (
      <div className="dashboard">
        <div className="VIP">
          <h1>VIP List</h1>

          <Paper className="dashboard-subcontent">
            <div className="dashboard-subheading">Add VIP</div>
              <div className="dashboard-subheading-content">
              <TextField ref="email" className="login-input" floatingLabelText="Add an email address"/>
              <RaisedButton className="vip-add-button" label="Add VIP" secondary={true} onClick={this.addVipHandler}/>
              </div>
          </Paper>
          <Paper className="vip-table-container" zDepth={4} >

          <h4>{numberOfVIPsMessage}</h4>
            <VIPtable data={this.props.vips} />
          </Paper>

        </div>
      </div>
    );
  }
});

module.exports = VIP;
