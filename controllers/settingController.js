const Setting = require('../models/settingModel');

exports.getAllSettings = async (req, res) => {
  try {
    const filter = {};
    if (req.user && req.user.role !== 'superadmin' && req.user.role !== 'super_admin') {
      if (req.user.garrison_id) filter.garrison_id = req.user.garrison_id;
      if (req.user.school_id) filter.school_id = req.user.school_id;
    }
    const settings = await Setting.getAll(filter);
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.getSettingsByGroup = async (req, res) => {
  try {
    const { groupName } = req.params;
    const filter = {};
    if (req.user && req.user.role !== 'superadmin' && req.user.role !== 'super_admin') {
      if (req.user.garrison_id) filter.garrison_id = req.user.garrison_id;
      if (req.user.school_id) filter.school_id = req.user.school_id;
    }
    const settings = await Setting.getByGroup(groupName, filter);
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings by group:', error);
    res.status(500).json({ error: 'Failed to fetch settings by group' });
  }
};

exports.createSetting = async (req, res) => {
  try {
    const { setting_group, setting_key, setting_value } = req.body;
    
    if (!setting_group || !setting_key) {
      return res.status(400).json({ error: 'setting_group and setting_key are required' });
    }

    const garrison_id = req.user ? req.user.garrison_id : null;
    const school_id = req.user ? req.user.school_id : null;

    const insertId = await Setting.create({ setting_group, setting_key, setting_value, garrison_id, school_id });
    const newSetting = await Setting.getById(insertId);
    
    res.status(201).json({ message: 'Setting created successfully', setting: newSetting });
  } catch (error) {
//...
    console.error('Error creating setting:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A setting with this key already exists in this group' });
    }
    res.status(500).json({ error: 'Failed to create setting' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { setting_group, setting_key, setting_value } = req.body;
    
    if (!setting_group || !setting_key) {
      return res.status(400).json({ error: 'setting_group and setting_key are required' });
    }

    const garrison_id = req.user ? req.user.garrison_id : null;
    const school_id = req.user ? req.user.school_id : null;
    const filter = (req.user && req.user.role !== 'superadmin' && req.user.role !== 'super_admin')
      ? { garrison_id } : {};

    const affectedRows = await Setting.update(id, { setting_group, setting_key, setting_value, garrison_id, school_id }, filter);
    
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const updatedSetting = await Setting.getById(id);
    res.status(200).json({ message: 'Setting updated successfully', setting: updatedSetting });
  } catch (error) {
    console.error('Error updating setting:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A setting with this key already exists in this group' });
    }
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

exports.deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const garrison_id = req.user ? req.user.garrison_id : null;
    const filter = (req.user && req.user.role !== 'superadmin' && req.user.role !== 'super_admin')
      ? { garrison_id } : {};

    const affectedRows = await Setting.delete(id, filter);
    
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.status(200).json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};
