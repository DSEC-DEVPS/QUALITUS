import moment from 'moment';

export const formaterLaDate = (d: any): string | null => {
  if (!d) {
    return null;
  } else if (moment.isMoment(d)) {
    console.log('Date Moment', d);
    console.log('Date Moment formater', d.format('YYYY-MM-DD'));
    return d.format('YYYY-MM-DD');
  } else if (d instanceof Date) {
    console.log('Date tout court', d);
    return moment(d).format('YYYY-MM-DD');
  } else {
    return d;
  }
};
