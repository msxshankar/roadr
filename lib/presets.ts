import { UKPresetRoute } from '@/types';

export const UK_SCENIC_ROUTES: UKPresetRoute[] = [
  {
    id: 'snake-pass',
    title: 'Peak District Pass (A57 Snake Pass)',
    subtitle: 'Manchester ➔ Sheffield via Snake Pass',
    tag: 'Rally & Backroads',
    origin: { name: 'Manchester', lng: -2.2426, lat: 53.4808 },
    destination: { name: 'Sheffield', lng: -1.4701, lat: 53.3811 },
  },
  {
    id: 'london-edinburgh',
    title: 'Great British Spine (A1/M1 North bound)',
    subtitle: 'London Trafalgar Square ➔ Edinburgh Royal Mile',
    tag: 'Long Haul Drive',
    origin: { name: 'London (Trafalgar Square)', lng: -0.1281, lat: 51.5080 },
    destination: { name: 'Edinburgh (Royal Mile)', lng: -3.1883, lat: 55.9533 },
  },
  {
    id: 'nc500-segment',
    title: 'North Coast 500 Highlands Route',
    subtitle: 'Inverness ➔ Ullapool Coastal Run',
    tag: 'Epic Scenic Drive',
    origin: { name: 'Inverness', lng: -4.2247, lat: 57.4778 },
    destination: { name: 'Ullapool', lng: -5.1603, lat: 57.8967 },
  },
  {
    id: 'snowdonia-pass',
    title: 'Snowdonia National Park Pass',
    subtitle: 'Betws-y-Coed ➔ Llanberis Pass',
    tag: 'Mountain Twisties',
    origin: { name: 'Betws-y-Coed', lng: -3.8016, lat: 53.0924 },
    destination: { name: 'Llanberis', lng: -4.1272, lat: 53.1166 },
  },
  {
    id: 'lake-district-loop',
    title: 'Lake District Kirkstone Pass',
    subtitle: 'Windermere ➔ Keswick',
    tag: 'Lake & Valley Tour',
    origin: { name: 'Windermere', lng: -2.9063, lat: 54.3781 },
    destination: { name: 'Keswick', lng: -3.1347, lat: 54.6003 },
  },
];
