module.exports = class SimpleCommand {
	constructor(name, description, args, usage) {
		this.name = name;
		this.description = description;
		this.args = args;
		this.usage = usage;
	}

	execute(message, args) {}
};
