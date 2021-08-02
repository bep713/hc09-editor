<template>
    <div class="coach-editor-wrapper">
        <DataTable :value="coachModel" stripedRows 
            sortMode="multiple" removableSort
            :paginator="true" :rows="10" :rowsPerPageOptions="[10,20,50]"
            v-model:filters="filters" filterDisplay="menu" :loading="isLoading"
            >
            <Column field="portrait" header="Portrait"></Column>
            <Column field="firstName" header="First name" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
            </Column>
            <Column field="lastName" header="Last name" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
            </Column>
            <Column field="position.short" header="Position" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
            </Column>
            <Column field="team.nickName" header="Team" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..." />
                </template>
            </Column>
            <Column field="overall" header="Overall" :sortable="true" dataType="numeric">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."/>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import { FilterMatchMode, FilterOperator } from 'primevue/api';

export default {
    name: 'CoachEditor',

    components: {
        Column,
        DataTable,
        InputText
    },

    props: {
        coachModel: Array
    },

    created() {
        
    },

    data() {
        return {
            filters: {
                firstName: { value: null, matchMode: FilterMatchMode.CONTAINS },
                lastName: { value: null, matchMode: FilterMatchMode.CONTAINS },
                'position.short': { value: null, matchMode: FilterMatchMode.CONTAINS },
                'team.nickName': { value: null, matchMode: FilterMatchMode.CONTAINS },
                overall: { value: null, matchMode: FilterMatchMode.EQUALS },
            },
            isLoading: false
        }
    },

    unmounted() {

    }
}
</script>

<style>

</style>