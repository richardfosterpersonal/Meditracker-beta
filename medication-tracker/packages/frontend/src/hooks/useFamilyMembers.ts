import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchFamilyMembers,
  inviteFamilyMember,
  updateFamilyMemberPermissions,
  removeFamilyMember,
  validateFamilyAddition,
} from '../store/slices/familySlice';
import { trackEvent } from '../utils/analytics';

export function useFamilyMembers() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    members,
    selectedMember,
    loading,
    error,
    inviteStatus,
    canAddMembers,
  } = useSelector((state: RootState) => state.family);

  useEffect(() => {
    dispatch(fetchFamilyMembers());
    dispatch(validateFamilyAddition());
  }, [dispatch]);

  const invite = async (data: {
    email: string;
    name: string;
    relationship: string;
  }) => {
    try {
      await dispatch(inviteFamilyMember(data)).unwrap();
      trackEvent('family_member_invited', {
        success: true,
        relationship: data.relationship,
      });
      return true;
    } catch (error) {
      trackEvent('family_member_invited', {
        success: false,
        error: error.message,
      });
      throw error;
    }
  };

  const updatePermissions = async (memberId: string, permissions: any) => {
    try {
      await dispatch(updateFamilyMemberPermissions({ memberId, permissions })).unwrap();
      trackEvent('family_permissions_updated', {
        success: true,
        memberId,
        permissions: Object.keys(permissions).filter(key => permissions[key]),
      });
      return true;
    } catch (error) {
      trackEvent('family_permissions_updated', {
        success: false,
        error: error.message,
        memberId,
      });
      throw error;
    }
  };

  const remove = async (memberId: string) => {
    try {
      await dispatch(removeFamilyMember(memberId)).unwrap();
      trackEvent('family_member_removed', {
        success: true,
        memberId,
      });
      return true;
    } catch (error) {
      trackEvent('family_member_removed', {
        success: false,
        error: error.message,
        memberId,
      });
      throw error;
    }
  };

  const refetch = () => {
    dispatch(fetchFamilyMembers());
    dispatch(validateFamilyAddition());
  };

  return {
    members,
    selectedMember,
    loading,
    error,
    inviteStatus,
    canAddMembers,
    invite,
    updatePermissions,
    remove,
    refetch,
  };
}
