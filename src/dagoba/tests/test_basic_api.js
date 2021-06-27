describe('Basics', () => {

  describe('Build a simple graph', () => {
    let g
    const v1 = {_id: 1, name: 'foo', type: 'banana'}
    const v2 = {_id: 2, name: 'bar', type: 'orange'}
    const e1 = { _out: 1, _in: 2, _label: 'fruitier'}

    it('should build an empty graph', () => {
      g = Dagoba.graph()
      g.should.be.an('object')
      g.edges.should.have.lengthOf(0)
      g.vertices.should.have.lengthOf(0)
    })

    it('should add a vertex v1', () => {
      g.addVertex(v1)
      g.edges.should.have.lengthOf(0)
      g.vertices.should.have.lengthOf(1)
    })

    it('should add another vertex v2', () => {
      g.addVertex(v2)
      g.edges.should.have.lengthOf(0)
      g.vertices.should.have.lengthOf(2)
    })

    it('should add an edge v1->v2', () => {
      g.addEdge(e1)
      g.edges.should.have.lengthOf(1)
      g.vertices.should.have.lengthOf(2)
    })

    it('g.v(1) should return v1', () => {
      const out = g.v(1).run()
      out.should.deep.equal([v1])
    })

    it('g.v(1).out() should follow out edge v1->v2 and return v2', () => {
      const out = g.v(1).out().run()
      out.should.deep.equal([v2])
    })

    it('g.v(2).in() should follow in edge v2<-v1 and return v1', () => {
      const out = g.v(2).in().run()
      out.should.deep.equal([v1])
    })

    it('g.v(2).out() should follow no edge and return nothing', () => {
      const out = g.v(2).out().run()
      out.should.be.empty
    })
  })
  
  describe('Build a bigger graph', () => {
    let g; let V; let E

    it('should build the graph', () => {
      const vertices = [ {_id:1, name:"Fred"}
                     , {_id:2, name:"Bob"}
                     , {_id:3, name:"Tom"}
                     , {_id:4, name:"Dick"}
                     , {_id:5, name:"Harry"} 
                     , {_id:6, name:"Lucy"} 
                     ]
                     
      const edges = [ { _out: 1, _in: 2, _label: "son"}
                  , { _out: 2, _in: 3, _label: "son"}
                  , { _out: 2, _in: 4, _label: "son"}
                  , { _out: 2, _in: 5, _label: "son"} 
                  , { _out: 2, _in: 6, _label: "daughter"} 
                  , { _out: 3, _in: 4, _label: "brother"} 
                  , { _out: 4, _in: 5, _label: "brother"} 
                  , { _out: 5, _in: 3, _label: "brother"} 
                  , { _out: 3, _in: 5, _label: "brother"} 
                  , { _out: 4, _in: 3, _label: "brother"} 
                  , { _out: 5, _in: 4, _label: "brother"} 
                  , { _out: 3, _in: 6, _label: "sister"} 
                  , { _out: 4, _in: 6, _label: "sister"} 
                  , { _out: 5, _in: 6, _label: "sister"} 
                  , { _out: 6, _in: 3, _label: "brother"} 
                  , { _out: 6, _in: 4, _label: "brother"} 
                  , { _out: 6, _in: 5, _label: "brother"} 
                  ]
                  
      g = Dagoba.graph(vertices, edges)
                  
      g.vertices.should.have.lengthOf(6)
      g.edges.should.have.lengthOf(17)
      V = vertices, E = edges
      V.unshift('')
    })

    it('g.v(1).out().out() should get all grandkids', () => {
      const out = g.v(1).out().out().run()
      out.should.deep.equal([ V[6], V[5], V[4], V[3] ])
    })

    it("g.v(1).out().in().out() means 'fred is his son's father'", () => {
      const out = g.v(1).out().in().out().run()
      out.should.deep.equal([ V[2] ])
    })

    it("g.v(1).out().out('daughter') should get the granddaughters", () => {
      const out = g.v(1).out().out('daughter').run()
      out.should.deep.equal([ V[6] ])
    })

    it("g.v(3).out('sister') means 'who is tom's sister?'", () => {
      const out = g.v(3).out('sister').run()
      out.should.deep.equal([ V[6] ])
    })

    it("g.v(3).out().in('son').in('son') means 'who is tom's brother's grandfather?'", () => {
      const out = g.v(3).out().in('son').in('son').run()
      out.should.deep.equal([ V[1], V[1] ])
    })

    it("g.v(3).out().in('son').in('son').unique() should return the unique grandfather", () => {
      const out = g.v(3).out().in('son').in('son').unique().run()
      out.should.deep.equal([ V[1] ])
    })

  //          , { fun: function(g, V, E) { return g.v(1).outAllN('son', 2).property('name').run()  /* all male hiers */ }
  //            , got: function(g, V, E) { return ["Bob","Harry","Dick","Tom"] } }
    
  })
  
  
  /*
  from header:
  
    V = [ {name: 'alice'}                                         // alice gets auto-_id (prolly 1)
        , {_id: 10, name: 'bob', hobbies: ['asdf', {x:3}]}] 
    E = [ {_out: 1, _in: 10, _label: 'knows'} ]
    g = Dagoba.graph(V, E)
    
    g.addVertex({name: 'charlie', _id: 'charlie'})                // string ids are fine
    g.addVertex({name: 'delta', _id: '30'})                       // in fact they're all strings

    g.addEdge({_out: 10, _in: 30, _label: 'parent'})
    g.addEdge({_out: 10, _in: 'charlie', _label: 'knows'})

    g.v(1).out('knows').out().run()                               // returns [charlie, delta]
    
    q = g.v(1).out('knows').out().take(1)
    q.run()                                                       // returns [charlie]
    q.run()                                                       // returns [delta]    (but don't rely on result order!)
    q.run()                                                       // returns []
  
  */
  
})