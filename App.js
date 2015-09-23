Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    projectOid:23112780161,
    tagOid:21580021389,
    intervals:[],
    numberOfMonths:6,
    queue:[],
    counter:0,
    launch: function() {
        this.getDates();
    },
    getDates:function(){
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait.This may take long depending on your data..."});
        this._myMask.show();
        var now = new Date();
        var firstDayOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        console.log('firstDayOfThisMonth',firstDayOfThisMonth); 
        Date.prototype.calcFullMonths = function(monthOffset) {
            var d = new Date(firstDayOfThisMonth); 
            d.setMonth(d.getMonth() - monthOffset);
            return d;
        };
        
        var howFarBack = (new Date()).calcFullMonths(this.numberOfMonths);
        for(var m=1; m <= this.numberOfMonths; m++){
            var firstDayOfNextMonth = new Date(howFarBack.getFullYear(), howFarBack.getMonth() + 1, 1);
            this.intervals.push({
                'from'  :   Rally.util.DateTime.format(howFarBack, 'Y-m-d'),          
                'to'    :   Rally.util.DateTime.format(firstDayOfNextMonth, 'Y-m-d'), 
                'month' :   howFarBack.toLocaleString('en-us', { month: 'long' }),
                'index' :   m
            });
            
            howFarBack = firstDayOfNextMonth;
        }
        console.log(this.intervals);
        
        this.counter = this.intervals.length;
        
        _.each(this.intervals, function(interval){
            console.log('interval.to', interval.to);
            this.getSnapshots(interval);
        },this);   
    },
    
    getSnapshots:function(interval){
        console.log('interval', interval);
        console.log('get Snapshots up to ', interval.to);
        Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['ObjectID','_ValidFrom','_ValidTo',
                    'Tags','ScheduleState','State'],
            find: {'_TypeHierarchy':'Defect','_ProjectHierarchy':this.projectOid,
            //'ScheduleState':{'$lt':'Accepted'},
            'State':{'$lt':'Closed'},
            'Tags':this.tagOid,
            '_ValidFrom':{'$lt':interval.to},'_ValidTo':{'$gt':interval.to}},
            hydrate: ['ScheduleState']
            }).load({
                callback: function(records, operation, success) {
                    console.log('records.length for',interval.month, records.length);
                    if (records.length > 0) {
                        var snapshotsNoDupes = _.uniq(records, function(record){
                            return record.data.ObjectID;
                        });
                        console.log('snapshotsNoDupes length',snapshotsNoDupes.length);
                        this.queue.push({'interval': interval.month, 'count':snapshotsNoDupes.length, 'index':interval.index});
                        this.counter--;
                        if (this.counter === 0) {
                            this.makeGrid();
                        }
                    }
                },
                scope:this,
                params : {
                    compress : true,
                    removeUnauthorizedSnapshots : true
                }
            });
    },
    
    makeGrid:function(){
        this._myMask.hide();
        this.queue = _.sortBy(this.queue, function(q) {
            return [q.index];
        });
       
        this.add({
            viewConfig: {
                enableTextSelection: true
            },
            xtype: 'rallygrid',
            itemId: 'queueGrid',
            showPagingToolbar: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: this.queue
            }),
            columnCfgs: [
                {text: 'Interval',  dataIndex: 'interval'},
                {text: 'Count',  dataIndex: 'count'}
            ]
        }); 
    }
});
