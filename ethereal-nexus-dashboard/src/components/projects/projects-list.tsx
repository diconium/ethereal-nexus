// 'use client';
// // import {Button, Col, message, Modal, Row, Table} from 'antd';
// // import {CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined} from "@ant-design/icons";
// import { useRouter } from 'next/navigation';
// import {useEffect, useState} from "react";
// import {Project} from "@/app/api/v1/projects/model";
// import {MessageInstance} from "antd/lib/message/interface";
//
// export default function ProjectsList() {
//     const [messageApi, messageContextHolder] = message.useMessage();
//     const [datasource, setDatasource] = useState([]);
//     const [toDelete, setToDelete] = useState<Project | undefined>();
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const router = useRouter();
//
//     useEffect(() => {
//         fetch('/api/v1/projects')
//             .then((response) => response.json())
//             .then((data) => {
//                 setDatasource(data);
//             });
//     }, []);
//     const columns = [
//         {
//             title: 'Name',
//             dataIndex: 'name',
//             key: 'name',
//         },
//         {
//             title: '# Components',
//             dataIndex: 'components',
//             key: 'components',
//             render: (components: string[]) => (<span>{components?.length || 0}</span>)
//         },
//         {
//             title: 'Actions',
//             dataIndex: '',
//             key: 'x',
//             render: (project: Project) => (
//                 <Col>
//                     <span style={{ marginRight: '0.5rem' }}>
//                         <Button shape='circle'
//                                 icon={<EditOutlined />}
//                                 size={'large'}
//                                 onClick={() => edit(project)} />
//                     </span>
//                     <span style={{ marginRight: '0.5rem' }}>
//                         <Button shape='circle'
//                                 icon={<DeleteOutlined />}
//                                 size={'large'}
//                                 onClick={() => deleteConfirmation(project)} />
//                     </span>
//                     <span>
//                         <Button shape='circle'
//                                 icon={<CopyOutlined />}
//                                 size={'large'}
//                                 onClick={() => copyProjectUrl(project, messageApi)} />
//                     </span>
//                 </Col>
//             )
//         },
//     ];
//
//     const edit = async (project: Project) => {
//         router.push(`/projects/${project._id.toString()}`);
//         router.refresh();
//     };
//
//     const deleteConfirmation = (project: Project) => {
//         setToDelete(project);
//         setIsModalOpen(true);
//     }
//
//     const handleDeleteOk = () => {
//         if(toDelete){
//             messageApi.open({
//                 type: 'loading',
//                 content: `Deleting ${toDelete.name}...`,
//                 duration: 0,
//             });
//             fetch(`api/v1/projects/${toDelete._id.toString()}`, {method: 'delete'}).then(() => {
//                 messageApi.destroy();
//                 setDatasource(datasource.filter((eachProject: Project) => toDelete.name !== eachProject.name));
//                 messageApi.open({
//                     type: 'success',
//                     content: `Project ${toDelete.name} was deleted successfully`,
//                 });
//                 setToDelete(undefined);
//                 setIsModalOpen(false);
//             }).catch((error) => {
//                 messageApi.destroy();
//                 console.error(`could not delete project ${error}`)
//                 messageApi.open({
//                     type: 'error',
//                     content: `Project ${toDelete.name} could not be deleted`,
//                 });
//                 setToDelete(undefined);
//                 setIsModalOpen(false);
//             });
//         }
//     }
//
//     const handleModalCancel = () => {
//         setIsModalOpen(false);
//         setToDelete(undefined);
//     }
//
//     const addNew = () => {
//         router.push(`/projects/0`);
//         router.refresh();
//     }
//
//     return (
//         <div>
//             {messageContextHolder}
//             <Row justify='end'>
//                 <Button type='primary'
//                         icon={<PlusOutlined />}
//                         onClick={() => addNew()} >Add new project</Button>
//             </Row>
//             <Table dataSource={datasource} columns={columns} rowKey="_id" />
//             <Modal title={`Delete ${toDelete?.name}`}
//                    open={isModalOpen}
//                    onOk={handleDeleteOk}
//                    onCancel={handleModalCancel}>
//                 <p>Are you sure you want to delete the project {toDelete?.name}</p>
//             </Modal>
//         </div>
//     )
// }
//
// const copyProjectUrl = (project: Project, messageApi: MessageInstance) =>{
//     navigator.clipboard.writeText(window.location.host + `/api/v1/projects/${project._id.toString()}/components`);
//     messageApi.open({
//         type: 'success',
//         content: 'Project URL copied to clipboard',
//     });
// }
