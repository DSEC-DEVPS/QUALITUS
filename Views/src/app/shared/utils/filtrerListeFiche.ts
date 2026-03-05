export function filtrerListeFiche(data: any, selectedNiveau: any): any[] {
  let filteredData: any = [];
  if (selectedNiveau) {
    if (selectedNiveau === '1') {
      filteredData = data?.filter((fiche: any) => fiche?.Niveau === '1' || fiche?.Niveau === '0');
      console.log('Step 1', filteredData);
    } else if (selectedNiveau === '2') {
      filteredData = data.filter((fiche: any) => fiche?.Niveau === '2' || fiche?.Niveau === '0');
      //console.log('Step 2', filteredData);
    } else if (selectedNiveau === 'reset') {
      filteredData = data;
      //console.log('Step 3', filteredData);
    }
  } else {
    filteredData = data;
  }
  return filteredData;
}
