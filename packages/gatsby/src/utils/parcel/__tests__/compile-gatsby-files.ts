import { Parcel } from "@parcel/core"
import {
  constructParcel,
  compileGatsbyFiles,
  gatsbyFileRegex,
  COMPILED_CACHE_DIR,
  PARCEL_CACHE_DIR,
} from "../compile-gatsby-files"
import { siteMetadata } from "./fixtures/utils/site-metadata"
import { moreDataConfig } from "./fixtures/utils/more-data-config"
import { readFile, remove, pathExists } from "fs-extra"

const dir = {
  js: `${__dirname}/fixtures/js`,
  ts: `${__dirname}/fixtures/ts`,
}

jest.mock(`@parcel/core`, () => {
  const parcelCore = jest.requireActual(`@parcel/core`)

  const { Parcel: OriginalParcel } = parcelCore

  class MockedParcel extends OriginalParcel {
    constructor(options) {
      super(options)
      this.options = options // Expose for assertions
    }
  }

  return {
    ...parcelCore,
    Parcel: MockedParcel,
  }
})

interface IMockedParcel extends Parcel {
  options: unknown
}

describe(`gatsby file compilation`, () => {
  describe(`constructBundler`, () => {
    it(`should construct Parcel relative to passed directory`, () => {
      const { options } = constructParcel(dir.js) as IMockedParcel

      expect(options).toMatchSnapshot({
        entries: [
          `${dir.js}/${gatsbyFileRegex}`,
          `${dir.js}/plugins/**/${gatsbyFileRegex}`,
        ],
        targets: {
          root: {
            distDir: `${dir.js}/${COMPILED_CACHE_DIR}`,
          },
        },
        cacheDir: `${dir.js}/${PARCEL_CACHE_DIR}`,
      })
    })
  })

  describe(`compileGatsbyFiles`, () => {
    describe(`js files are not touched`, () => {
      beforeAll(async () => {
        await remove(`${dir.js}/.cache`)
        await compileGatsbyFiles(dir.js)
      })

      it(`should not compile gatsby-config.js`, async () => {
        const isCompiled = await pathExists(
          `${dir.js}/.cache/compiled/gatsby-config.js`
        )
        expect(isCompiled).toEqual(false)
      })

      it(`should not compile gatsby-node.js`, async () => {
        const isCompiled = await pathExists(
          `${dir.js}/.cache/compiled/gatsby-node.js`
        )
        expect(isCompiled).toEqual(false)
      })
    })

    describe(`ts files are compiled`, () => {
      beforeAll(async () => {
        await remove(`${dir.ts}/.cache`)
        await compileGatsbyFiles(dir.ts)
      })

      it(`should compile gatsby-config.ts`, async () => {
        const compiledGatsbyConfig = await readFile(
          `${dir.ts}/.cache/compiled/gatsby-config.js`,
          `utf-8`
        )

        expect(compiledGatsbyConfig).toContain(siteMetadata.title)
        expect(compiledGatsbyConfig).toContain(siteMetadata.siteUrl)
        expect(compiledGatsbyConfig).toContain(moreDataConfig.options.name)
      })

      it(`should compile gatsby-node.ts`, async () => {
        const compiledGatsbyNode = await readFile(
          `${dir.ts}/.cache/compiled/gatsby-node.js`,
          `utf-8`
        )

        expect(compiledGatsbyNode).toContain(`I am working!`)
      })
    })
  })
})
