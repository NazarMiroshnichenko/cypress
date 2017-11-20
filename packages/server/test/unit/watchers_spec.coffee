require("../spec_helper")

_        = require("lodash")
chokidar = require("chokidar")
Watchers = require("#{root}lib/watchers")

describe "lib/watchers", ->
  beforeEach ->
    @standardWatcher = @sandbox.stub({
      on:    ->
      close: ->
    })

    @sandbox.stub(chokidar, "watch").returns(@standardWatcher)
    @watchers = Watchers()

  it "returns instance of watcher class", ->
    expect(@watchers).to.be.instanceof(Watchers)

  context "#watch", ->
    beforeEach ->
      @watchers.watch("/foo/bar")

    it "watches with chokidar", ->
      expect(chokidar.watch).to.be.calledWith("/foo/bar")

    it "stores a reference to the watcher", ->
      expect(_.keys(@watchers.watchers)).to.have.length(1)
      expect(@watchers.watchers).to.have.property("/foo/bar")

  context "#close", ->
    it "removes each watched property", ->
      watched1 = {close: @sandbox.spy()}
      @watchers._add("/one", watched1)

      watched2 = {close: @sandbox.spy()}
      @watchers._add("/two", watched2)

      expect(_.keys(@watchers.watchers)).to.have.length(2)

      @watchers.close()

      expect(watched1.close).to.be.calledOnce
      expect(watched2.close).to.be.calledOnce

      expect(_.keys(@watchers.watchers)).to.have.length(0)
