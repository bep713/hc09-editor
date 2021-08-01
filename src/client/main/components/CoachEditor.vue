<template>
    <div class="coach-editor-wrapper">
        <DataTable :value="coachModel">
            <Column field="portrait" header="Portrait"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="position" header="Position"></Column>
            <Column field="team" header="Team"></Column>
            <Column field="overall" header="Overall"></Column>
        </DataTable>
    </div>
</template>

<script>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';

export default {
    name: 'CoachEditor',

    components: {
        Column,
        DataTable
    },

    props: {
        coachModel: Array
    },

    created() {
        
    },

    data() {
        return {
            
        }
    },

    unmounted() {

    }
}
</script>

<style>

</style>