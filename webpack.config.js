module.exports = {
	entry: {
		main: './src/ui/main.js',
		art: './src/ui/art.js',
		mosaic: './src/ui/mosaic.js',
		vanilla: './src/vanilla/ui.main.js',
	},
	output: {
		path: __dirname,
		filename: 'bundle.[name].js',
		sourceMapFilename: 'bundle.[name].js.map',
	},
	devtool: 'cheap-source-map',
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					query: {
						presets: ["@babel/preset-react", [
							"@babel/preset-env", {
								useBuiltIns: 'usage',
								targets: {
									browsers: [
										"firefox esr",
										"last 2 chrome version",
										"last 1 ios version",
										"last 1 and_chr version",
										"last 1 edge version",
									],
								},
							},
						]],
						plugins: [
							"@babel/plugin-transform-react-jsx",
							"@babel/plugin-proposal-class-properties",
							"@babel/plugin-proposal-object-rest-spread",
						],
					},
				},
			},
		],
	},
};
