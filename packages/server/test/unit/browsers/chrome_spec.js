/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require("../../spec_helper");

const os = require("os");

const extension = require("@packages/extension");
const plugins = require(`${root}../lib/plugins`);
const utils = require(`${root}../lib/browsers/utils`);
const chrome = require(`${root}../lib/browsers/chrome`);
const fs = require(`${root}../lib/util/fs`);
const errors = require(`${root}../lib/errors`);

describe("lib/browsers/chrome", function() {
  context("#open", function() {
    beforeEach(function() {
      // mock CRI client during testing
      this.criClient = {
        ensureMinimumProtocolVersion: sinon.stub().resolves(),
        send: sinon.stub().resolves(),
        Page: {
          screencastFrame: sinon.stub().returns()
        },
        close: sinon.stub().resolves()
      };
      this.automation = {
        use: sinon.stub().returns()
      };
      // mock launched browser child process object
      this.launchedBrowser = {
        kill: sinon.stub().returns()
      };

      sinon.stub(chrome, "_writeExtension").resolves("/path/to/ext");
      sinon.stub(chrome, "_connectToChromeRemoteInterface").resolves(this.criClient);
      sinon.stub(plugins, "execute").callThrough();
      sinon.stub(utils, "launch").resolves(this.launchedBrowser);
      sinon.stub(utils, "getProfileDir").returns("/profile/dir");
      sinon.stub(utils, "ensureCleanCache").resolves("/profile/dir/CypressCache");

      this.readJson = sinon.stub(fs, 'readJson');
      this.readJson.withArgs('/profile/dir/Default/Preferences').rejects({ code: 'ENOENT' });
      this.readJson.withArgs('/profile/dir/Default/Secure Preferences').rejects({ code: 'ENOENT' });
      this.readJson.withArgs('/profile/dir/Local State').rejects({ code: 'ENOENT' });

      // port for Chrome remote interface communication
      return sinon.stub(utils, "getPort").resolves(50505);
    });

    afterEach(function() {
      return expect(this.criClient.ensureMinimumProtocolVersion).to.be.calledOnce;
    });

    it("focuses on the page and calls CRI Page.visit", function() {
      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => {
        expect(utils.getPort).to.have.been.calledOnce; // to get remote interface port
        expect(this.criClient.send).to.have.been.calledTwice;
        expect(this.criClient.send).to.have.been.calledWith("Page.bringToFront");
        return expect(this.criClient.send).to.have.been.calledWith("Page.navigate");
      });
    });

    it("is noop without before:browser:launch", function() {
      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => expect(plugins.execute).not.to.be.called);
    });

    it("is noop if newArgs are not returned", function() {
      const args = [];

      sinon.stub(chrome, "_getArgs").returns(args);
      sinon.stub(plugins, 'has').returns(true);

      plugins.execute.resolves(null);

      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => {
        // to initialize remote interface client and prepare for true tests
        // we load the browser with blank page first
        return expect(utils.launch).to.be.calledWith("chrome", "about:blank", args);
      });
    });

    it("sets default window size in headless mode", function() {
      chrome._writeExtension.restore();

      const pathToTheme = extension.getPathToTheme();

      return chrome.open({ isHeadless: true, isHeaded: false }, "http://", {}, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        return expect(args).to.include.members([
          "--headless",
          "--window-size=1280,720"
        ]);
      });
    });

    it("does not load extension in headless mode", function() {
      chrome._writeExtension.restore();

      const pathToTheme = extension.getPathToTheme();

      return chrome.open({ isHeadless: true, isHeaded: false }, "http://", {}, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        return expect(args).to.include.members([
          "--headless",
          "--remote-debugging-port=50505",
          "--remote-debugging-address=127.0.0.1",
          "--user-data-dir=/profile/dir",
          "--disk-cache-dir=/profile/dir/CypressCache"
        ]);
      });
    });

    it("uses a custom profilePath if supplied", function() {
      chrome._writeExtension.restore();
      utils.getProfileDir.restore();

      const profilePath = '/home/foo/snap/chromium/current';
      const fullPath = `${profilePath}/Cypress/chromium-stable/interactive`;

      this.readJson.withArgs(`${fullPath}/Default/Preferences`).rejects({ code: 'ENOENT' });
      this.readJson.withArgs(`${fullPath}/Default/Secure Preferences`).rejects({ code: 'ENOENT' });
      this.readJson.withArgs(`${fullPath}/Local State`).rejects({ code: 'ENOENT' });

      return chrome.open({
        isHeadless: true,
        isHeaded: false,
        profilePath,
        name: 'chromium',
        channel: 'stable'
      }, "http://", {}, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        return expect(args).to.include.members([
          `--user-data-dir=${fullPath}`
        ]);
      });
    });

    it("DEPRECATED: normalizes --load-extension if provided in plugin", function() {
      plugins.register('before:browser:launch', (browser, config) => Promise.resolve(["--foo=bar", "--load-extension=/foo/bar/baz.js"]));

      const pathToTheme = extension.getPathToTheme();

      const onWarning = sinon.stub();

      return chrome.open("chrome", "http://", { onWarning }, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        expect(args).to.deep.eq([
          "--foo=bar",
          `--load-extension=/foo/bar/baz.js,/path/to/ext,${pathToTheme}`,
          "--user-data-dir=/profile/dir",
          "--disk-cache-dir=/profile/dir/CypressCache"
        ]);

        return expect(onWarning).calledOnce;
      });
    });

    it("normalizes --load-extension if provided in plugin", function() {
      plugins.register('before:browser:launch', (browser, config) => Promise.resolve({
        args: ["--foo=bar", "--load-extension=/foo/bar/baz.js"]
      }));

      const pathToTheme = extension.getPathToTheme();

      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        return expect(args).to.include.members([
          "--foo=bar",
          `--load-extension=/foo/bar/baz.js,/path/to/ext,${pathToTheme}`,
          "--user-data-dir=/profile/dir",
          "--disk-cache-dir=/profile/dir/CypressCache"
        ]);
      });
    });

    it("normalizes multiple extensions from plugins", function() {
      plugins.register('before:browser:launch', (browser, config) => Promise.resolve({args: ["--foo=bar", "--load-extension=/foo/bar/baz.js,/quux.js"]}));

      const pathToTheme = extension.getPathToTheme();

      const onWarning = sinon.stub();

      return chrome.open("chrome", "http://", { onWarning }, this.automation)
      .then(() => {
        const args = utils.launch.firstCall.args[2];

        expect(args).to.include.members([
          "--foo=bar",
          `--load-extension=/foo/bar/baz.js,/quux.js,/path/to/ext,${pathToTheme}`,
          "--user-data-dir=/profile/dir",
          "--disk-cache-dir=/profile/dir/CypressCache"
        ]);

        return expect(onWarning).not.calledOnce;
      });
    });

    it("cleans up an unclean browser profile exit status", function() {
      this.readJson.withArgs("/profile/dir/Default/Preferences").resolves({
        profile: {
          exit_type: "Abnormal",
          exited_cleanly: false
        }
      });
      sinon.stub(fs, "outputJson").resolves();

      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => expect(fs.outputJson).to.be.calledWith("/profile/dir/Default/Preferences", {
        profile: {
          exit_type: "Normal",
          exited_cleanly: true
        }
      }));
    });

    it("calls cri client close on kill", function() {
      //# need a reference here since the stub will be monkey-patched
      const {
        kill
      } = this.launchedBrowser;

      return chrome.open("chrome", "http://", {}, this.automation)
      .then(() => {
        expect(this.launchedBrowser.kill).to.be.a("function");
        return this.launchedBrowser.kill();
    }).then(() => {
        expect(this.criClient.close).to.be.calledOnce;
        return expect(kill).to.be.calledOnce;
      });
    });

    return it("rejects if CDP version check fails", function() {
      this.criClient.ensureMinimumProtocolVersion.rejects();

      return expect(chrome.open("chrome", "http://", {}, this.automation)).to.be.rejectedWith('Cypress requires at least Chrome 64.');
    });
  });

  context("#_getArgs", function() {
    it("disables gpu when linux", function() {
      sinon.stub(os, "platform").returns("linux");

      const args = chrome._getArgs({}, {});

      return expect(args).to.include("--disable-gpu");
    });

    it("does not disable gpu when not linux", function() {
      sinon.stub(os, "platform").returns("darwin");

      const args = chrome._getArgs({}, {});

      return expect(args).not.to.include("--disable-gpu");
    });

    it("turns off sandbox when linux", function() {
      sinon.stub(os, "platform").returns("linux");

      const args = chrome._getArgs({}, {});

      return expect(args).to.include("--no-sandbox");
    });

    it("does not turn off sandbox when not linux", function() {
      sinon.stub(os, "platform").returns("win32");

      const args = chrome._getArgs({}, {});

      return expect(args).not.to.include("--no-sandbox");
    });

    it("adds user agent when options.userAgent", function() {
      const args = chrome._getArgs({}, {
        userAgent: "foo"
      });

      return expect(args).to.include("--user-agent=foo");
    });

    it("does not add user agent", function() {
      const args = chrome._getArgs({}, {});

      return expect(args).not.to.include("--user-agent=foo");
    });

    it("disables RootLayerScrolling in versions 66 or 67", function() {
      const arg = "--disable-blink-features=RootLayerScrolling";

      const disabledRootLayerScrolling = function(version, bool) {
        const args = chrome._getArgs({
          majorVersion: version
        }, {});

        if (bool) {
          return expect(args).to.include(arg);
        } else {
          return expect(args).not.to.include(arg);
        }
      };

      disabledRootLayerScrolling("65", false);
      disabledRootLayerScrolling("66", true);
      disabledRootLayerScrolling("67", true);
      return disabledRootLayerScrolling("68", false);
    });

    //# https://github.com/cypress-io/cypress/issues/1872
    return it("adds <-loopback> proxy bypass rule in version 72+", function() {
      const arg = "--proxy-bypass-list=<-loopback>";

      const chromeVersionHasLoopback = function(version, bool) {
        const args = chrome._getArgs({
          majorVersion: version
        }, {});

        if (bool) {
          return expect(args).to.include(arg);
        } else {
          return expect(args).not.to.include(arg);
        }
      };

      chromeVersionHasLoopback("71", false);
      chromeVersionHasLoopback("72", true);
      return chromeVersionHasLoopback("73", true);
    });
  });

  context("#_getChromePreferences", function() {
    it("returns map of empty if the files do not exist", function() {
      sinon.stub(fs, 'readJson')
      .withArgs('/foo/Default/Preferences').rejects({ code: 'ENOENT' })
      .withArgs('/foo/Default/Secure Preferences').rejects({ code: 'ENOENT' })
      .withArgs('/foo/Local State').rejects({ code: 'ENOENT' });

      return expect(chrome._getChromePreferences('/foo')).to.eventually.deep.eq({
        default: {},
        defaultSecure: {},
        localState: {}
      });
    });

    return it("returns map of json objects if the files do exist", function() {
      sinon.stub(fs, 'readJson')
      .withArgs('/foo/Default/Preferences').resolves({ foo: 'bar' })
      .withArgs('/foo/Default/Secure Preferences').resolves({ bar: 'baz' })
      .withArgs('/foo/Local State').resolves({ baz: 'quux' });

      return expect(chrome._getChromePreferences('/foo')).to.eventually.deep.eq({
        default: { foo: 'bar' },
        defaultSecure: { bar: 'baz' },
        localState: { baz: 'quux' }
      });
    });
  });

  context("#_mergeChromePreferences", () => it("merges as expected", function() {
    const originalPrefs = {
      default: {},
      defaultSecure: {
        foo: 'bar',
        deleteThis: 'nephew'
      },
      localState: {}
    };

    const newPrefs = {
      default: {
        something: {
          nested: 'here'
        },
      },
      defaultSecure: {
        deleteThis: null
      },
      someGarbage: true
    };

    const expected = {
      default: {
        something: {
          nested: 'here'
        }
      },
      defaultSecure: {
        foo: 'bar'
      },
      localState: {}
    };

    return expect(chrome._mergeChromePreferences(originalPrefs, newPrefs)).to.deep.eq(expected);
  }));

  return context("#_writeChromePreferences", () => it("writes json as expected", function() {
    const outputJson = sinon.stub(fs, 'outputJson');
    const defaultPrefs = outputJson.withArgs('/foo/Default/Preferences').resolves();
    const securePrefs = outputJson.withArgs('/foo/Default/Secure Preferences').resolves();
    const statePrefs = outputJson.withArgs('/foo/Local State').resolves();

    const originalPrefs = {
      default: {},
      defaultSecure: {
        foo: 'bar',
        deleteThis: 'nephew'
      },
      localState: {}
    };

    const newPrefs = chrome._mergeChromePreferences(originalPrefs, {
      default: {
        something: {
          nested: 'here'
        },
      },
      defaultSecure: {
        deleteThis: null
      },
      someGarbage: true
    });

    return expect(chrome._writeChromePreferences('/foo', originalPrefs, newPrefs)).to.eventually.equal()
    .then(function() {
      expect(defaultPrefs).to.be.calledWith('/foo/Default/Preferences', {
        something: {
          nested: 'here'
        },
      });

      expect(securePrefs).to.be.calledWith('/foo/Default/Secure Preferences', {
        foo: 'bar'
      });

      //# no changes were made
      return expect(statePrefs).to.not.be.called;
    });
  }));
});
