
// Requires the latest version of Node that supports { const, let, class } declarations. Tested on v9.7.1

(module => {

	const keys = require('core-js/library/fn/object/keys'), entries = require('core-js/library/fn/object/entries')
	
	const trimLeftRight = str => str.replace(/^\s*(.+?)\s*$/, '$1')

	const emptystr = String()

	const space = '\u0020'

	const keyValueRegExp = /\s*([\w\-]+?)\s*\=\s*(.+?)(?:\s*$)/
	
	const scriptHavingSrcAttributeRegExp = 
		/(\<script)([ \n\r\t\f]+)([\s\S]*?\b)(src[ \n\r\t\f]*=[ \n\r\t\f]*(\"|\')(.*?)\5)([\s\S]*?\>)([ \n\r\t\f]*)(\<\/script\>)/gi
	
	const htmlAssetRegExp = /(.+?)\.html$/i

	class HtmlWebpackScriptsPlugin {
		
		constructor(options) {
			this._options = options || {}
			if (keys(this._options).length == 0) this._noOptions = true
		}

		_modifySource(source, size) { return { source: () => source, size: () => size } }

		_emitHandler(webpackCompilation, callback) {
			
			if (this._noOptions) return callback()

			scriptHavingSrcAttributeRegExp.lastIndex = 0

			const assets = webpackCompilation.assets
			const assetsNames = keys(assets)
			
			let lookupAsset = 0, lookupAssetName

			for (let v = 0; v < assetsNames.length; ++v) {
				if (htmlAssetRegExp.test(lookupAssetName = assetsNames[v])) {
					lookupAsset = assets[lookupAssetName]
					break
				}
			}

			if (lookupAsset == 0) return callback()

			let lookupAssetSource = lookupAsset.source(),
					lookupAssetSourceProcessed
			
			let optionsEntries = entries(this._options)

			lookupAssetSourceProcessed = lookupAssetSource.replace(scriptHavingSrcAttributeRegExp, (_, $1, $2, $3, $4, $5, $6, $7, $8, $9, index, input) => {

				for (let i = 0, assetName; i < assetsNames.length; ++i) {
					if (trimLeftRight($6).includes(assetName = assetsNames[i])) {

						let shouldAssetBeInlined = false
						let optionsEntriesProcessed = optionsEntries.reduce((optionsEntriesProcessed, entry) => {
							
							let attributes = entry[0]
							let pattern = entry[1]

							if (pattern.test(assetName)) {
								let attributesSplitted = trimLeftRight(attributes).split(/\s+/)
								let attributesProcessed = attributesSplitted.reduce((attributesProcessed, attribute) => {
									if (attribute.includes('=')) {
										let attributeEntities = attribute.match(keyValueRegExp)
										return `${attributesProcessed}${attributeEntities[1]}=\"${attributeEntities[2]}\"${space}`
									}
									else {
										if (attribute == 'inline') {
											shouldAssetBeInlined = true
											return attributesProcessed
										}
										else {
											return `${attributesProcessed}${attribute}${space}`
										}
									}
								}, emptystr)
								return `${optionsEntriesProcessed}${attributesProcessed}`
							}
							else { return optionsEntriesProcessed }

						}, emptystr)
						
						optionsEntriesProcessed = trimLeftRight(optionsEntriesProcessed).split(/\s+/).join(space)

						if (shouldAssetBeInlined) {
							let assetSource = assets[assetName].source()
							assets[assetName] = this._modifySource(emptystr, 0)
							return `${$1} ${optionsEntriesProcessed}${$2}${$3}${$7}${assetSource}${$9}`
						}
						else {
							return `${$1} ${optionsEntriesProcessed}${$2}${$3}${$4}${$7}${$8}${$9}`
						}

					}
					else { if (i == assetsNames.length - 1) return _ }

				}
			})

			assets[lookupAssetName] = this._modifySource(lookupAssetSourceProcessed, lookupAssetSourceProcessed.length)
			callback()
		}

		apply(webpackCompiler) {
			webpackCompiler.plugin('emit', this._emitHandler.bind(this))
		}

	}

	module.exports = HtmlWebpackScriptsPlugin

})(module)

