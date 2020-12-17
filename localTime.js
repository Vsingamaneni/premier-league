exports = module.exports = {};

exports.iff = function(localString){
    return new Date(localString).toLocaleDateString() + " " + new Date(localString).toLocaleTimeString();
}
