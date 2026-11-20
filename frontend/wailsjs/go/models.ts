export namespace backend {
	
	export class UpdateInfo {
	    current: string;
	    version: string;
	    url: string;
	    available: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.current = source["current"];
	        this.version = source["version"];
	        this.url = source["url"];
	        this.available = source["available"];
	    }
	}

}

