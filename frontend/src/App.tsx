import { AppBar, Box, Button, Container, Toolbar } from '@mui/material';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DashboardPage, GroupExportCard, LoginPage, PackageDetailPage, ShipmentsPage, SimpleListPage } from './pages/Pages';

const PkgWrap=()=>{const {id='0'}=useParams(); return <PackageDetailPage id={id}/>}

export const App=()=> <Box><AppBar position='static'><Toolbar><Button color='inherit' component={Link} to='/'>Dashboard</Button><Button color='inherit' component={Link} to='/shipments'>Shipments</Button><Button color='inherit' component={Link} to='/customers'>Customers</Button></Toolbar></AppBar><Container sx={{py:2}}><Routes>
<Route path='/login' element={<LoginPage/>}/><Route path='/' element={<DashboardPage/>}/>
<Route path='/customers' element={<><SimpleListPage title='Customers' endpoint='/api/customers'/><GroupExportCard/></>}/>
<Route path='/warehouses' element={<SimpleListPage title='Warehouses' endpoint='/api/warehouses'/>}/>
<Route path='/good-types' element={<SimpleListPage title='Good Types' endpoint='/api/good-types'/>}/>
<Route path='/goods' element={<SimpleListPage title='Goods' endpoint='/api/goods'/>}/>
<Route path='/pricing-configs' element={<SimpleListPage title='Pricing Configs' endpoint='/api/pricing-configs'/>}/>
<Route path='/shipments' element={<ShipmentsPage/>}/>
<Route path='/packages' element={<SimpleListPage title='Packages' endpoint='/api/packages'/>}/>
<Route path='/packages/:id' element={<PkgWrap/>}/>
<Route path='/suppliers' element={<SimpleListPage title='Suppliers' endpoint='/api/suppliers'/>}/>
<Route path='/supply-orders' element={<SimpleListPage title='Supply Orders' endpoint='/api/supply-orders'/>}/>
<Route path='/messaging-logs' element={<SimpleListPage title='Messaging Logs' endpoint='/api/whatsapp/campaigns'/>}/>
<Route path='*' element={<Navigate to='/'/>}/>
</Routes></Container></Box>
