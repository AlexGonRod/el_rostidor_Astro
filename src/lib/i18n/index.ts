import catalan from './ca.json'
import spanish from './es.json'


export const geti18n = ({pathname = 'ca'}: {pathname: string | undefined}) =>{
    if(pathname === "/es") return spanish
    if(pathname === '') return catalan
    return catalan
}
