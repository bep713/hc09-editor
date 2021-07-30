const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const nodeExternals = require('webpack-node-externals');
// const 

module.exports = {
    mode: 'none',
    entry: './src/client/main/index.js',
    target: 'node',
    devtool: 'inline-cheap-module-source-map',
    // output: {
    //     filename: 'bundle.js',
    //     path: path.resolve(__dirname, '../test/ui/dist')
    // },
    plugins: [
        new VueLoaderPlugin()
    ],
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    rootMode: "upward"
                }
            },
            {
                test: /\.vue$/,
                use: {
                    loader: 'vue-loader',
                    options: {
                        extractCSS: process.env.NODE_ENV === 'production',
                        loaders: {
                            sass: 'vue-style-loader!css-loader!sass-loader',
                            scss: 'vue-style-loader!css-loader!sass-loader'
                        },
                        isServerBuild: false
                    }
                }
            },
            {
                test: /\.scss$/,
                use: ['vue-style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.sass$/,
                use: ['vue-style-loader', 'css-loader', 'sass-loader?indentedSyntax']
            },
            {
                test: /\.css$/,
                use: ['vue-style-loader', 'css-loader']
            },
            {
                test: /\.html$/,
                use: 'vue-html-loader'
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
                type: 'asset/resource'
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
            },
        ]
    },
    resolve: {
        alias: {
            vue: '@vue/runtime-dom'
        },
        extensions: ['.js', '.vue', '.json', '.css', '.node']
    }
}