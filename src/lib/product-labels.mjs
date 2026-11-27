// Presentation-only alias for the original reference project. Registry data is unchanged.
export function projectLabel(config,id,name){return config.mode==='testnet'&&String(id)===String(config.demoProject)&&name==='Canary demo vault'?'Canary reference vault':name;}
export function checkLabel(config,projectId,check){return config.mode==='testnet'&&String(projectId)===String(config.demoProject)&&String(check.target).toLowerCase()===String(config.demo).toLowerCase()&&check.name==='Reserve floor (demo units)'?'Reserve floor (reference units)':check.name;}
export function isReference(config,id){return config.mode==='testnet'&&!!config.demoProject&&String(id)===String(config.demoProject);}
